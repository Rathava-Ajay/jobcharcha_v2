using JobPortal.Application.Common;

namespace JobPortal.Tests;

public class CsvUtilTests
{
    [Fact]
    public void Parse_SimpleCsv_ReturnsRowsKeyedByHeader()
    {
        var csv = "Title,CategoryId\nBackend Engineer,1\nFrontend Engineer,2\n";

        var rows = CsvUtil.Parse(csv);

        Assert.Equal(2, rows.Count);
        Assert.Equal("Backend Engineer", rows[0]["Title"]);
        Assert.Equal("1", rows[0]["CategoryId"]);
        Assert.Equal("Frontend Engineer", rows[1]["Title"]);
    }

    [Fact]
    public void Parse_QuotedFieldWithEmbeddedComma_ParsesAsOneField()
    {
        var csv = "Title,Location\n\"Engineer, Backend\",Ahmedabad\n";

        var rows = CsvUtil.Parse(csv);

        Assert.Equal("Engineer, Backend", rows[0]["Title"]);
        Assert.Equal("Ahmedabad", rows[0]["Location"]);
    }

    [Fact]
    public void Parse_QuotedFieldWithEmbeddedNewline_ParsesAsOneField()
    {
        var csv = "Title,Description\nEngineer,\"Line one\nLine two\"\n";

        var rows = CsvUtil.Parse(csv);

        Assert.Equal("Line one\nLine two", rows[0]["Description"]);
    }

    [Fact]
    public void Parse_EscapedQuoteInsideQuotedField_Unescapes()
    {
        var csv = "Title,Notes\nEngineer,\"He said \"\"hello\"\"\"\n";

        var rows = CsvUtil.Parse(csv);

        Assert.Equal("He said \"hello\"", rows[0]["Notes"]);
    }

    [Fact]
    public void Parse_HeaderLookupIsCaseInsensitive()
    {
        var csv = "TITLE\nBackend Engineer\n";

        var rows = CsvUtil.Parse(csv);

        Assert.Equal("Backend Engineer", rows[0]["title"]);
    }

    [Fact]
    public void WriteThenParse_RoundTripsFieldsNeedingEscaping()
    {
        var headers = new[] { "Title", "Description" };
        var data = new List<IReadOnlyList<string?>>
        {
            new List<string?> { "Has, a comma", "Multi\nline\nvalue with \"quotes\"" },
        };

        var csv = CsvUtil.Write(headers, data);
        var rows = CsvUtil.Parse(csv);

        Assert.Equal("Has, a comma", rows[0]["Title"]);
        Assert.Equal("Multi\nline\nvalue with \"quotes\"", rows[0]["Description"]);
    }

    [Fact]
    public void Parse_EmptyContent_ReturnsNoRows()
    {
        Assert.Empty(CsvUtil.Parse(""));
    }
}
