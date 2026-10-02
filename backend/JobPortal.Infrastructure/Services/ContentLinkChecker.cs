using System.Net;
using System.Net.Sockets;
using JobPortal.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace JobPortal.Infrastructure.Services;

/// <summary>Checks that a link an AI draft points to actually answers, so dead links show up as warnings in review.
/// The URL comes from AI output (which read arbitrary web pages), so this is hardened against SSRF: http(s) only,
/// every hop's host must resolve to public addresses only, and redirects are followed manually (max 3).
/// Government sites often have bad certificates and block bots, so a bad certificate or a 401/403 is NOT
/// treated as a dead link — only 404/410, 5xx, DNS failures and timeouts are.</summary>
public class ContentLinkChecker : IContentLinkChecker
{
    public const string ClientName = "content-link-check";
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(8);

    private readonly IHttpClientFactory _factory;
    private readonly ILogger<ContentLinkChecker> _logger;

    public ContentLinkChecker(IHttpClientFactory factory, ILogger<ContentLinkChecker> logger)
    {
        _factory = factory;
        _logger = logger;
    }

    public async Task<string?> CheckAsync(string url)
    {
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return "isn't a valid web address";

        try
        {
            using var cts = new CancellationTokenSource(Timeout);
            var client = _factory.CreateClient(ClientName);

            for (var hop = 0; hop < 4; hop++)
            {
                if (!await IsPublicHostAsync(uri.Host, cts.Token)) return "points to a non-public address";

                var status = await SendAsync(client, HttpMethod.Head, uri, cts.Token);
                if (status.Code >= 400 && status.Code != 404 && status.Code != 410) // many servers mishandle HEAD
                    status = await SendAsync(client, HttpMethod.Get, uri, cts.Token);

                if (status.Code is >= 300 and < 400 && status.Location is not null)
                {
                    uri = new Uri(uri, status.Location);
                    if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return "redirects to an unsupported address";
                    continue;
                }

                if (status.Code is >= 200 and < 400) return null;
                if (status.Code is 401 or 403 or 429) return null; // bot protection / login wall — can't verify, don't cry wolf
                return $"returned HTTP {status.Code}";
            }
            return "redirects too many times";
        }
        catch (OperationCanceledException) { return "didn't respond in time"; }
        catch (HttpRequestException ex) when (ex.InnerException is System.Security.Authentication.AuthenticationException) { return null; }
        catch (HttpRequestException) { return "couldn't be reached"; }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Link check failed for {Url}", url);
            return "couldn't be checked";
        }
    }

    private static async Task<(int Code, Uri? Location)> SendAsync(HttpClient client, HttpMethod method, Uri uri, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(method, uri);
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        return ((int)response.StatusCode, response.Headers.Location);
    }

    public static async Task<bool> IsPublicHostAsync(string host, CancellationToken ct)
    {
        IPAddress[] addresses;
        try { addresses = IPAddress.TryParse(host, out var literal) ? new[] { literal } : await Dns.GetHostAddressesAsync(host, ct); }
        catch (SocketException) { return true; } // unresolvable: let the request itself fail and report "couldn't be reached"
        return addresses.Length > 0 && addresses.All(IsPublic);
    }

    public static bool IsPublic(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return false;
        if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast) return false;
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
            return (ip.GetAddressBytes()[0] & 0xFE) != 0xFC; // fc00::/7 unique-local
        var b = ip.GetAddressBytes();
        return !(b[0] == 10
              || b[0] == 127
              || b[0] == 0
              || (b[0] == 172 && b[1] >= 16 && b[1] <= 31)
              || (b[0] == 192 && b[1] == 168)
              || (b[0] == 169 && b[1] == 254)
              || (b[0] == 100 && b[1] >= 64 && b[1] <= 127)
              || b[0] >= 224);
    }
}
