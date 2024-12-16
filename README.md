# LACI
LACI is a roles and responsibilities manager. It was designed around Azure Active Directory for use in a corporate environment.

LACI stands for:
- Laborer
- Accountable
- Consulted
- Informed

These fields are configurable within the application.

Responsibilities are also configurable, by default they are:
- Application
- Billing
- Database
- Infrastructure
- Licensing
- Network
- Operating System
- Security
- User Access
- User Support

Each responsibility has a LACI assignment. These are called LACI entries.
LACI entries are assigned to applications and services.

# Installation
Administrators are configured in code by a generic "LACI Administrators" group. Create and assign this in Azure AD.

Approvers can be added within the web application.
LACI fields and responsibilities can be customized within the web application.

## Azure
Configure the following environment variables:
```bash
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
```

## NextAuth
Configure the following environment variables:
```bash
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## Cloudflare
This is optional, but I swear by Cloudflare tunnels. The Docker compose will automatically stand up the tunnel.

The Docker container uses a backend network for application communication, so you'll access via your Cloudflare domain.
```bash
CLOUDFLARE_TOKEN=
```

## Redis
This application uses redis for caching. Configure the following environment variables:
```bash
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

## MySQL
This application uses MySQL as a database. Configure the following environment variables:
```bash
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=laci_db
MYSQL_USER=laci_user
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=
```

Install the schema into your database using `src/lib/mysql/schema.sql`.

## Okta (optional)
Okta is available for auth only. I may eventually write API calls for user/group lookups to match auth provider, but Azure
was better for my use case(s).
```bash
OKTA_DOMAIN=
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=
```

# Development
Execute `npm run docker` to bring up the development environment in Docker, or run `npm run dev` to start locally.

Use `.env` for environment variables.
