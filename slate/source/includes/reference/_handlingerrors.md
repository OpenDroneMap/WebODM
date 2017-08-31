## Handling Errors

All API calls use the status codes as described in the [Django REST Framework's Status Code Guide](http://www.django-rest-framework.org/api-guide/status-codes/), but generally you only need to check for success status codes (`200` or `204`), handle the special case of [Token Expiration](#token-expiration) (`403`) and report an error otherwise.

### Error Status Codes

This is not an exhaustive list, but common error codes are listed below. 

Status Code | Description
----------- | -----------
401 | Unauthenticated
403 | Forbidden (token expired?)
400 | Malformed request
404 | Not found

For security reasons, sometimes an operation which should return `403` returns `404` to avoid disclosing IDs and other information to attackers.
