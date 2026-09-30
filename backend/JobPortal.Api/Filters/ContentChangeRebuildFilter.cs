using System.Text.RegularExpressions;
using JobPortal.Application.Interfaces;
using Microsoft.AspNetCore.Mvc.Filters;

namespace JobPortal.Api.Filters;

/// <summary>
/// After any successful mutating request (POST/PUT/PATCH/DELETE) to a public-content route, asks
/// <see cref="IPrerenderSignal"/> to schedule a static re-prerender. One place instead of a call
/// in every content service. No-op unless <c>Prerender:FlagPath</c> is configured.
/// </summary>
public class ContentChangeRebuildFilter : IAsyncActionFilter
{
    // Routes whose content ends up on a prerendered public page.
    private static readonly Regex ContentRoute = new(
        @"^/api/(jobs|results|admitcards|govtschemes|news|blog|old-papers|categories)(/|$)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly string[] Mutating = { "POST", "PUT", "PATCH", "DELETE" };

    private readonly IPrerenderSignal _signal;

    public ContentChangeRebuildFilter(IPrerenderSignal signal) => _signal = signal;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var executed = await next();

        var req = context.HttpContext.Request;
        if (!Mutating.Contains(req.Method)) return;
        if (!ContentRoute.IsMatch(req.Path.Value ?? string.Empty)) return;

        var status = executed.HttpContext.Response.StatusCode;
        if (status is >= 200 and < 300)
            _signal.RequestRebuild($"{req.Method} {req.Path}");
    }
}
