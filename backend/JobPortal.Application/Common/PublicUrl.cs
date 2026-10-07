using System.Net;

namespace JobPortal.Application.Common;

public static class PublicUrl
{
    /// <summary>False for addresses an outside service (Instagram, Facebook, Telegram) can never download from: localhost, loopback,
    /// private network ranges, and *.local / *.test / *.localhost / *.internal names.</summary>
    public static bool IsReachable(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme is not ("http" or "https")) return false;

        var host = uri.Host.ToLowerInvariant();
        if (host == "localhost" || host.EndsWith(".localhost") || host.EndsWith(".local") || host.EndsWith(".test") || host.EndsWith(".internal") || !host.Contains('.') && !host.Contains(':'))
            return false;

        if (IPAddress.TryParse(host, out var ip))
        {
            if (IPAddress.IsLoopback(ip)) return false;
            var b = ip.GetAddressBytes();
            if (b.Length == 4)
            {
                if (b[0] == 10 || b[0] == 127 || b[0] == 0) return false;
                if (b[0] == 192 && b[1] == 168) return false;
                if (b[0] == 172 && b[1] is >= 16 and <= 31) return false;
                if (b[0] == 169 && b[1] == 254) return false;
            }
            else if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal) return false;
        }
        return true;
    }
}
