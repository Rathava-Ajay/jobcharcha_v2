using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace JobPortal.Infrastructure.Data.Entities;

[Index("PaymentId", Name = "IX_TestPurchases_PaymentId")]
[Index("TestId", Name = "IX_TestPurchases_TestId")]
[Index("UserId", "TestId", Name = "IX_TestPurchases_UserId_TestId", IsUnique = true)]
public partial class TestPurchase
{
    [Key]
    public int Id { get; set; }

    public string UserId { get; set; } = null!;

    public int TestId { get; set; }

    [Column(TypeName = "decimal(10, 2)")]
    public decimal Price { get; set; }

    public DateTime PurchasedAt { get; set; }

    public int? PaymentId { get; set; }

    [ForeignKey("PaymentId")]
    [InverseProperty("TestPurchases")]
    public virtual AspirantPayment? Payment { get; set; }

    [ForeignKey("TestId")]
    [InverseProperty("TestPurchases")]
    public virtual Test Test { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("TestPurchases")]
    public virtual AspNetUser User { get; set; } = null!;
}
