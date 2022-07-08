# Reference

## Authentication

### Authentication Basics

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

> Use authentication token via querystring (less secure):

```bash
curl http://localhost:8000/api/projects/?jwt=<your_token>

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

The token expires after a set amount of time. See [Token Expiration](#token-expiration) for more information.

Since applications sometimes do not allow headers to be modified, you can also authenticate by appending the `jwt` querystring parameter to a protected URL. This is less secure, so pass the token via header if possible.


### Token Expiration

The token expires after six hours by default. The expiration time is defined in the settings module of Django in WebODM. If building WebODM from sources or running it natively, the expiration time can be changed in the `JWT_AUTH['JWT_EXPIRATION_DELTA']` variable. Otherwise, e.g. using the docker images, you will have to request another token when a token expires.

You know that a token has expired if any API call returns a `403` status code with the JSON body `{'detail': 'Signature has expired.'}`.
