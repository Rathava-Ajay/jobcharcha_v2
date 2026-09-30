using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("IsActive", Name = "IX_AspirantPlans_IsActive")]
public partial class AspirantPlan
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string Name { get; set; } = null!;

    [StringLength(100)]
    public string? NameGujarati { get; set; }

    [StringLength(500)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    public int DurationDays { get; set; }

    public bool UnlocksAllTests { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("Plan")]
    public virtual ICollection<AspirantPayment> AspirantPayments { get; set; } = new List<AspirantPayment>();

    [InverseProperty("Plan")]
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
