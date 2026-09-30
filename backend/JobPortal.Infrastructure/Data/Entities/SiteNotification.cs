using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

public partial class SiteNotification
{
    [Key]
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Message { get; set; } = null!;

    public string Type { get; set; } = null!;

    public string? ActionUrl { get; set; }

    public string? ActionText { get; set; }

    public string Target { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public bool ShowAsPopup { get; set; }

    public bool ShowAsBanner { get; set; }

    public int DisplayOrder { get; set; }

    public int ViewCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
