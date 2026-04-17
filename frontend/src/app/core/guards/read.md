# Guards

## Purpose

Guards are used to control access to routes in the application.

They protect pages based on:

- Authentication
- Authorization
- Role-based access
- Feature restrictions

## Why Important?

Guards:

- Prevent unauthorized users from accessing protected routes
- Improve security
- Enforce business rules before navigation
- Redirect users when conditions fail

## Common Guards

- AuthGuard → Prevents access if user is not logged in
- RoleGuard → Allows only specific roles
- GuestGuard → Prevents logged-in users from accessing login page

## Example Use Case

```ts
{
  path: 'dashboard',
  canActivate: [AuthGuard],
  loadComponent: () => import('./dashboard')
}
```
