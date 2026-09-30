using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("EndsAt", Name = "IX_Attempts_EndsAt")]
[Index("TestId", Name = "IX_Attempts_TestId")]
[Index("UserId", "TestId", "Status", Name = "IX_Attempts_UserId_TestId_Status")]
public partial class Attempt
{
    [Key]
    public int Id { get; set; }

    public string UserId { get; set; } = null!;

    public int TestId { get; set; }

    public int Status { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime EndsAt { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public int RemainingSeconds { get; set; }

    public string? QuestionOrderJson { get; set; }

    public string? OptionOrderJson { get; set; }

    public int CurrentQuestionIndex { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public bool IsActive { get; set; }

    [StringLength(64)]
    public string? ActiveClientSessionId { get; set; }

    public DateTime? LastHeartbeatAt { get; set; }

    public int MultiTabWarnings { get; set; }

    public int TabSwitchCount { get; set; }

    [InverseProperty("Attempt")]
    public virtual ICollection<Response> Responses { get; set; } = new List<Response>();

    [InverseProperty("Attempt")]
    public virtual ResultsAnalytic? ResultsAnalytic { get; set; }

    [ForeignKey("TestId")]
    [InverseProperty("Attempts")]
    public virtual Test Test { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("Attempts")]
    public virtual AspNetUser User { get; set; } = null!;
}
