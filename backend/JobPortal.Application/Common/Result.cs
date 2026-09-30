namespace JobPortal.Application.Common;

public class ServiceResult
{
    public bool Succeeded { get; init; }
    public string? ErrorCode { get; init; }
    public string? Error { get; init; }

    public static ServiceResult Ok() => new() { Succeeded = true };
    public static ServiceResult Fail(string errorCode, string error) => new() { Succeeded = false, ErrorCode = errorCode, Error = error };
}

public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; init; }

    public static ServiceResult<T> Ok(T data) => new() { Succeeded = true, Data = data };
    public static new ServiceResult<T> Fail(string errorCode, string error) => new() { Succeeded = false, ErrorCode = errorCode, Error = error };
}
