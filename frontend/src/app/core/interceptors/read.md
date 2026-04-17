
---

# 📁 interceptors/README.md

```md
# Interceptors

## Purpose
Interceptors intercept every HTTP request and response.

They are used for:
- Attaching authentication tokens
- Logging requests
- Handling errors globally
- Modifying headers
- Showing loading spinners

## Why Important?

Interceptors:
- Centralize HTTP logic
- Avoid repetitive token code
- Improve maintainability
- Enable global error handling

## Common Interceptors

- AuthInterceptor → Adds JWT token
- ErrorInterceptor → Handles API errors
- LoadingInterceptor → Shows loader during requests

## Example

Automatically attach token:

```ts
Authorization: Bearer <token>