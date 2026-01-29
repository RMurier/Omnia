namespace api.Exceptions;

public sealed class ApiException : Exception
{
    public int StatusCode { get; }
    public string Key { get; }

    public ApiException(int statusCode, string key, Exception? inner = null)
        : base(key, inner)
    {
        StatusCode = statusCode;
        Key = key;
    }
}
