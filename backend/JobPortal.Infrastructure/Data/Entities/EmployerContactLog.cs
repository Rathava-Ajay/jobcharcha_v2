using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EmployerProfileId", "CandidateUserId", Name = "IX_EmployerContactLogs_EmployerProfileId_CandidateUserId")]
public partial class EmployerContactLog
{
    [Key]
    public int Id { get; set; }

    public int EmployerProfileId { get; set; }

    public string CandidateUserId { get; set; } = null!;

    [StringLength(30)]
    public string Status { get; set; } = null!;

    public bool CreditDeducted { get; set; }

    public int CreditsBefore { get; set; }

    public int CreditsAfter { get; set; }

    [StringLength(1000)]
    public string? InitialMessage { get; set; }

    public DateTime CreatedDate { get; set; }

    [ForeignKey("EmployerProfileId")]
    [InverseProperty("EmployerContactLogs")]
    public virtual EmployerProfile EmployerProfile { get; set; } = null!;

    [ForeignKey("CandidateUserId")]
    [InverseProperty("EmployerContactLogsAsCandidate")]
    public virtual AspNetUser CandidateUser { get; set; } = null!;
}
