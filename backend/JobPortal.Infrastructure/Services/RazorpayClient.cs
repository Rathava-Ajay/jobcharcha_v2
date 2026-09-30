using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using JobPortal.Application.Common;
using JobPortal.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace JobPortal.Infrastructure.Services;

public class RazorpayClient : IRazorpayClient
{
    private readonly HttpClient _http;

    public RazorpayClient(HttpClient http, IOptions<RazorpaySettings> options)
    {
        var settings = options.Value;
        _http = http;
        _http.BaseAddress ??= new Uri("https://api.razorpay.com/v1/");
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{settings.KeyId}:{settings.KeySecret}"));
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
    }

    public async Task<RazorpayOrderResult> CreateOrderAsync(long amountPaise, string currency, string receipt)
    {
        var response = await _http.PostAsJsonAsync("orders", new RazorpayCreateOrderRequest
        {
            Amount = amountPaise,
            Currency = currency,
            Receipt = receipt,
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Razorpay order creation failed ({(int)response.StatusCode}): {error}");
        }

        var order = await response.Content.ReadFromJsonAsync<RazorpayOrderResponse>()
            ?? throw new InvalidOperationException("Razorpay returned an empty order response.");

        return new RazorpayOrderResult
        {
            Id = order.Id,
            Amount = order.Amount,
            Currency = order.Currency,
            Status = order.Status,
        };
    }

    public async Task<RazorpayAuthCheckResult> CheckAuthAsync()
    {
        try
        {
            var response = await _http.GetAsync("payments?count=1");
            if (response.IsSuccessStatusCode)
                return new RazorpayAuthCheckResult { Ok = true, StatusCode = (int)response.StatusCode, Detail = "Authenticated" };

            var status = (int)response.StatusCode;
            var detail = status == 401
                ? "Authentication failed (401) — Razorpay__KeyId / Razorpay__KeySecret on the server are missing or wrong."
                : $"Razorpay returned HTTP {status}.";
            return new RazorpayAuthCheckResult { Ok = false, StatusCode = status, Detail = detail };
        }
        catch (Exception ex)
        {
            return new RazorpayAuthCheckResult { Ok = false, StatusCode = 0, Detail = $"Could not reach Razorpay: {ex.Message}" };
        }
    }

    public async Task<RazorpayRefundResult> CreateRefundAsync(string razorpayPaymentId, long? amountPaise)
    {
        var response = await _http.PostAsJsonAsync($"payments/{razorpayPaymentId}/refund", new RazorpayCreateRefundRequest
        {
            Amount = amountPaise,
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Razorpay refund failed ({(int)response.StatusCode}): {error}");
        }

        var refund = await response.Content.ReadFromJsonAsync<RazorpayRefundResponse>()
            ?? throw new InvalidOperationException("Razorpay returned an empty refund response.");

        return new RazorpayRefundResult
        {
            Id = refund.Id,
            PaymentId = refund.PaymentId,
            Amount = refund.Amount,
            Status = refund.Status,
        };
    }

    public async Task<IReadOnlyList<RazorpayPaymentStatusResult>> FetchOrderPaymentsAsync(string razorpayOrderId)
    {
        var response = await _http.GetAsync($"orders/{razorpayOrderId}/payments");

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Razorpay order-payments lookup failed ({(int)response.StatusCode}): {error}");
        }

        var payments = await response.Content.ReadFromJsonAsync<RazorpayOrderPaymentsResponse>()
            ?? throw new InvalidOperationException("Razorpay returned an empty order-payments response.");

        return payments.Items.Select(p => new RazorpayPaymentStatusResult
        {
            Id = p.Id,
            OrderId = p.OrderId,
            Status = p.Status,
            Amount = p.Amount,
        }).ToList();
    }

    private class RazorpayCreateOrderRequest
    {
        [JsonPropertyName("amount")]
        public long Amount { get; set; }

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = null!;

        [JsonPropertyName("receipt")]
        public string Receipt { get; set; } = null!;

        [JsonPropertyName("payment_capture")]
        public int PaymentCapture { get; set; } = 1;
    }

    private class RazorpayOrderResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = null!;

        [JsonPropertyName("amount")]
        public long Amount { get; set; }

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = null!;

        [JsonPropertyName("status")]
        public string Status { get; set; } = null!;
    }

    private class RazorpayCreateRefundRequest
    {
        [JsonPropertyName("amount")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public long? Amount { get; set; }
    }

    private class RazorpayRefundResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = null!;

        [JsonPropertyName("payment_id")]
        public string PaymentId { get; set; } = null!;

        [JsonPropertyName("amount")]
        public long Amount { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = null!;
    }

    private class RazorpayOrderPaymentsResponse
    {
        [JsonPropertyName("items")]
        public List<RazorpayPaymentItem> Items { get; set; } = new();
    }

    private class RazorpayPaymentItem
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = null!;

        [JsonPropertyName("order_id")]
        public string OrderId { get; set; } = null!;

        [JsonPropertyName("status")]
        public string Status { get; set; } = null!;

        [JsonPropertyName("amount")]
        public long Amount { get; set; }
    }
}
