# Setting up e-mail

LocalDesk reads your mail directly from Google – with no third-party service in between.
For that you need your own “app” at Google. It sounds bigger than it is: you create one
project and copy two values into the LocalDesk settings.

**What LocalDesk does with your mail:** read it, summarize it and – only after your
confirmation – add labels or set a star. LocalDesk has no sending and no deleting. Mail is
not stored on your PC; it only goes to your local model (Ollama).

Outlook comes later: since 2024 Microsoft requires a directory of its own (an Azure account)
for every app registration, which we will set up together then.

## Gmail

Time: about 10 minutes. You only need your Google account, no credit card.

### 1. Create a project

1. Open <https://console.cloud.google.com/> and sign in with the Google account whose mail
   LocalDesk should read.
2. At the top left, open the project picker → **New project**.
3. Name: `LocalDesk` → **Create**. Then make sure this project is selected at the top.

### 2. Turn on the Gmail API

1. Menu → **APIs & Services** → **Library**.
2. Search for **Gmail API**, open it → **Enable**.

### 3. Sign-in page (Google Auth Platform)

1. Menu → **APIs & Services** → **OAuth consent screen**
   (now also called **Google Auth Platform**) → **Get started**.
2. **App information:** app name `LocalDesk`, support e-mail = your address.
3. **Audience:** **External**.
4. **Contact information:** your address. Agree to the policies → **Create**.

### 4. Add the permission (scope)

1. On the left, **Data Access** → **Add or remove scopes**.
2. In the field “Manually add scopes”, enter:
   `https://www.googleapis.com/auth/gmail.modify` → **Add to table** →
   **Update** → **Save** at the bottom.

> **Why `gmail.modify`?** It lets LocalDesk read and change labels/stars. Google has no
> permission for “labels only, but no deleting” – technically this permission allows more
> than LocalDesk uses. That is why LocalDesk itself decides which calls exist at all:
> sending and deleting are not built in.

### 5. Add yourself as a test user

1. On the left, **Audience** → **Test users** → **Add users** → your Gmail address →
   **Save**.

> **7 days:** While the status is “Testing”, Google signs you out after 7 days – LocalDesk
> then shows “Please sign in again”. **Publish app** (status “In production”) would help,
> but since autumn 2026 this button stays greyed out for many private apps, probably
> because Google now requires links to a home page and a privacy policy. We will add those
> when LocalDesk is published. You do **not** apply for a review by Google.

### 6. Create the credentials (client)

1. On the left, **Clients** → **Create client**.
2. Application type: **Desktop app**, name `LocalDesk` → **Create**.
3. **Client ID** (ends in `.apps.googleusercontent.com`) and **Client secret** (usually
   starts with `GOCSPX-`) appear. Copy both.

### 7. Enter them in LocalDesk

LocalDesk → **Settings** → **E-mail** → **Set up Gmail** → paste client ID and client secret
→ **Save**.

> According to Google, the client secret of a desktop app is not a real secret – it is part
> of every installed copy. Your mailbox is protected by your sign-in (which is stored
> encrypted), not by this key.

### The first time you sign in

Google shows “**Google hasn't verified this app**”. That is normal for your own, unreviewed
app: **Advanced** → **Go to LocalDesk (unsafe)** → allow access. Check that your own app
name is shown at the top.

### Taking access away again

In LocalDesk, click **Sign out** – or at Google under
<https://myaccount.google.com/permissions> → LocalDesk → **Remove access**.
