# API Endpoints — v1

Base path: `/api/v1`

All protected endpoints require authenticated session/token. All resource operations must verify workspace membership and permissions.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register |
| GET | `/users/me` | Current profile |
| PATCH | `/users/me` | Update profile |
| GET | `/dashboard` | Dashboard summary |
| POST | `/documents` | Create upload record / request signed upload |
| GET | `/documents` | List documents |
| GET | `/documents/:id` | Document details |
| POST | `/documents/:id/process` | Enqueue processing |
| POST | `/documents/:id/confirm-extraction` | Confirm or correct extraction |
| DELETE | `/documents/:id` | Delete document |
| GET | `/memory/search` | Search memory |
| POST | `/assistant/chat` | Ask assistant |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task |
| GET | `/events` | List events |
| POST | `/events` | Create event |
| GET | `/reminders` | List reminders |
| POST | `/reminders` | Create reminder |
| POST | `/approvals/:id/approve` | Approve proposed action |
| POST | `/approvals/:id/reject` | Reject proposed action |
| GET | `/account/export` | Request data export |
| DELETE | `/account` | Request account deletion |

## API conventions
- Use UUID resource identifiers.
- Validate request and response schemas.
- Use ISO 8601 timestamps with timezone.
- Use cursor pagination for large lists.
- Use idempotency keys for upload and action creation.
- Return stable error codes.
- Never return private storage paths or provider secrets.
- Include source IDs in assistant citations.
- Rate-limit AI and upload endpoints.

## Example assistant response
```json
{
  "answer": "Ada satu tagihan yang jatuh tempo pada 25 November.",
  "sources": [
    {
      "document_id": "uuid",
      "title": "Tagihan Internet",
      "page": 1
    }
  ],
  "suggested_actions": [
    {
      "type": "create_reminder",
      "requires_approval": true
    }
  ]
}
```
