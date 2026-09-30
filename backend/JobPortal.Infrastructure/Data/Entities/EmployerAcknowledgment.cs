using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerProfileId", Name = "IX_EmployerAcknowledgments_EmployerProfileId")]
public partial class EmployerAcknowledgment
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    [StringLength(20)]
    public string PlanVersion { get; set; } = null!;

    public DateTime AcceptedAt { get; set; }

    [StringLength(45)]
    public string? IpAddress { get; set; }

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("EmployerAcknowledgments")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;
}
