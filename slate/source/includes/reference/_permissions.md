# Reference

## Authentication

> Get authentication token:

```bash
curl -X POST -d "username=testuser&password=testpass" http://localhost:8000/api/token-auth/

{"token":"eyJ0eXAiO..."}
```

> Use authentication token:

```bash
curl -H "Authorization: JWT <your_token>" http://localhost:8000/api/projects/

{"count":13, ...}
```

`POST /api/token-auth/`

Field | Type | Description
----- | ---- | -----------
username | string | Username
password | string | Password

To access the API, you need to provide a valid username and password. You can create users from WebODM's Administration page.

If authentication is successful, you will be issued a token. All API calls should include the following header:

Header |
------ |
Authorization: JWT `your_token` |

The token expires after a set amount of time. The expiration time is dependent on WebODM's settings. You will need to request another token when a token expires.
