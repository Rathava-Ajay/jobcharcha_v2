using System.Net.Http.Json;
using System.Text.Json;
using JobPortal.Application.Common;

namespace JobPortal.Infrastructure.Services;

public interface IOpenAiImageClient
{
    /// <summary>Generates one background picture and returns the encoded image bytes. Throws
    /// <see cref="SocialShareException"/> on failure.</summary>
    Task<byte[]> GenerateBackgroundAsync(string prompt, bool portrait, CancellationToken ct = default);
}

/// <summary>OpenAI Images API. The model name comes from configuration (SocialShare:OpenAiImageModel), so moving to a
/// newer model is a config change. Works with gpt-image-* (always base64) and dall-e-3 style (url or base64).</summary>
public class OpenAiImageClient : IOpenAiImageClient
{
    private readonly HttpClient _http;
    private readonly SocialShareOptions _options;

    public OpenAiImageClient(HttpClient http, SocialShareOptions options)
    {
        _http = http;
        _options = options;
    }

    public async Task<byte[]> GenerateBackgroundAsync(string prompt, bool portrait, CancellationToken ct = default)
    {
        if (!_options.OpenAiConfigured)
            throw new SocialShareException("OpenAI isn't configured (OPENAI_API_KEY).", retryable: false);

        var model = _options.OpenAiImageModel;
        var isGptImage = model.StartsWith("gpt-image", StringComparison.OrdinalIgnoreCase);
        var body = new Dictionary<string, object?>
        {
            ["model"] = model,
            ["prompt"] = prompt,
            ["n"] = 1,
            ["size"] = isGptImage ? (portrait ? "1024x1536" : "1024x1024") : (portrait ? "1024x1792" : "1024x1024"),
        };
        if (isGptImage) body["quality"] = "medium";
        else body["response_format"] = "b64_json";

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/images/generations")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.OpenAiApiKey);

        HttpResponseMessage response;
        try
        {
            response = await _http.SendAsync(request, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new SocialShareException("Could not reach OpenAI (network error or timeout).", retryable: true);
        }

        using (response)
        {
            var status = (int)response.StatusCode;
            var json = await response.Content.ReadAsStringAsync(ct);
            JsonDocument doc;
            try { doc = JsonDocument.Parse(json); }
            catch (JsonException) { throw new SocialShareException($"OpenAI returned an unreadable response ({status}).", status >= 500); }

            using (doc)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var message = doc.RootElement.TryGetProperty("error", out var err) && err.TryGetProperty("message", out var m)
                        ? m.GetString() : "unknown error";
                    throw new SocialShareException($"OpenAI image generation failed ({status}): {message}", status == 429 || status >= 500);
                }

                var item = doc.RootElement.GetProperty("data")[0];
                if (item.TryGetProperty("b64_json", out var b64) && b64.GetString() is { Length: > 0 } b)
                    return Convert.FromBase64String(b);

                if (item.TryGetProperty("url", out var u) && u.GetString() is { Length: > 0 } url)
                {
                    try { return await _http.GetByteArrayAsync(url, ct); }
                    catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                    {
                        throw new SocialShareException("Could not download the generated image.", retryable: true);
                    }
                }
            }
        }

        throw new SocialShareException("OpenAI returned no image.", retryable: false);
    }
}
