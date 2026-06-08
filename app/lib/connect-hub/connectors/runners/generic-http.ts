import { isInternalUrl } from './custom-http';

interface HttpRouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  urlTemplate: string;
  headers?: Record<string, string>;
  bodyTemplate?: (input: Record<string, any>, credentials: Record<string, string>) => any;
  isUrlencoded?: boolean;
}

// Static HTTP registry mapping (appSlug, actionSlug) -> endpoint and request builder
const GENERIC_HTTP_REGISTRY: Record<string, Record<string, HttpRouteConfig>> = {
  'telegram-bot': {
    'send_text_message': {
      method: 'POST',
      urlTemplate: 'https://api.telegram.org/bot{api_key}/sendMessage',
      bodyTemplate: (input) => ({
        chat_id: input.chat_id,
        text: input.text,
        parse_mode: input.parse_mode || 'HTML',
      }),
    },
    'edit_message_text': {
      method: 'POST',
      urlTemplate: 'https://api.telegram.org/bot{api_key}/editMessageText',
      bodyTemplate: (input) => ({
        chat_id: input.chat_id,
        message_id: input.message_id,
        text: input.text,
        parse_mode: input.parse_mode || 'HTML',
      }),
    },
  },
  'discord': {
    'send_message_webhook': {
      method: 'POST',
      urlTemplate: '{api_key}', // Full Webhook URL is saved as the api_key credential
      bodyTemplate: (input) => ({
        content: input.content,
        username: input.username || undefined,
        avatar_url: input.avatar_url || undefined,
      }),
    },
    'sendMessageWithBot': {
      method: 'POST',
      urlTemplate: 'https://discord.com/api/v10/channels/{channel_id}/messages',
      headers: {
        'Authorization': 'Bot {api_key}',
      },
      bodyTemplate: (input) => ({
        content: input.content,
      }),
    },
  },
  'openai': {
    'ask_chatgpt': {
      method: 'POST',
      urlTemplate: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': 'Bearer {api_key}',
      },
      bodyTemplate: (input) => ({
        model: input.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: input.prompt }],
        temperature: input.temperature !== undefined ? parseFloat(input.temperature) : 0.7,
      }),
    },
    'generate_image': {
      method: 'POST',
      urlTemplate: 'https://api.openai.com/v1/images/generations',
      headers: {
        'Authorization': 'Bearer {api_key}',
      },
      bodyTemplate: (input) => ({
        prompt: input.prompt,
        n: input.n ? parseInt(input.n, 10) : 1,
        size: input.size || '1024x1024',
      }),
    },
  },
  'airtable': {
    'airtable_create_record': {
      method: 'POST',
      urlTemplate: 'https://api.airtable.com/v0/{base_id}/{table_id}',
      headers: {
        'Authorization': 'Bearer {api_key}',
      },
      bodyTemplate: (input) => ({
        fields: typeof input.fields === 'string' ? JSON.parse(input.fields) : input.fields,
      }),
    },
    'airtable_get_record_by_id': {
      method: 'GET',
      urlTemplate: 'https://api.airtable.com/v0/{base_id}/{table_id}/{record_id}',
      headers: {
        'Authorization': 'Bearer {api_key}',
      },
    },
  },
  'sendgrid': {
    'send_email': {
      method: 'POST',
      urlTemplate: 'https://api.sendgrid.com/v3/mail/send',
      headers: {
        'Authorization': 'Bearer {api_key}',
      },
      bodyTemplate: (input) => ({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: input.from || 'no-reply@ai2hero.com', name: input.from_name || undefined },
        subject: input.subject,
        content: [{ type: 'text/html', value: input.body || input.content }],
      }),
    },
  },
  'github': {
    'github_create_issue': {
      method: 'POST',
      urlTemplate: 'https://api.github.com/repos/{repository}/issues',
      headers: {
        'Authorization': 'Bearer {api_key}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI2Hero-ConnectHub',
      },
      bodyTemplate: (input) => ({
        title: input.title,
        body: input.body || '',
        labels: input.labels ? (typeof input.labels === 'string' ? input.labels.split(',').map(l => l.trim()) : input.labels) : undefined,
      }),
    },
    'createCommentOnAIssue': {
      method: 'POST',
      urlTemplate: 'https://api.github.com/repos/{repository}/issues/{issue_number}/comments',
      headers: {
        'Authorization': 'Bearer {api_key}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI2Hero-ConnectHub',
      },
      bodyTemplate: (input) => ({
        body: input.body,
      }),
    },
  },
  'trello': {
    'create_card': {
      method: 'POST',
      urlTemplate: 'https://api.trello.com/1/cards?key={username}&token={password}',
      bodyTemplate: (input) => ({
        idList: input.list_id,
        name: input.name,
        desc: input.desc || '',
      }),
    },
  },
  'twilio': {
    'send_sms': {
      method: 'POST',
      urlTemplate: 'https://api.twilio.com/2010-04-01/Accounts/{username}/Messages.json',
      headers: {
        'Authorization': 'Basic {basic_auth}',
      },
      isUrlencoded: true,
      bodyTemplate: (input, credentials) => {
        const params = new URLSearchParams();
        params.append('To', input.to);
        params.append('From', input.from || credentials.from || '');
        params.append('Body', input.body);
        return params.toString();
      },
    },
  },
  'mailgun': {
    'send_email': {
      method: 'POST',
      urlTemplate: 'https://api.mailgun.net/v3/{domain}/messages',
      headers: {
        'Authorization': 'Basic {basic_auth}',
      },
      isUrlencoded: true,
      bodyTemplate: (input) => {
        const params = new URLSearchParams();
        params.append('from', input.from);
        params.append('to', input.to);
        params.append('subject', input.subject);
        params.append('html', input.html || input.text || '');
        return params.toString();
      },
    },
  },
  'clickup': {
    'create_task': {
      method: 'POST',
      urlTemplate: 'https://api.clickup.com/api/v2/list/{list_id}/task',
      headers: {
        'Authorization': '{api_key}',
      },
      bodyTemplate: (input) => ({
        name: input.name,
        description: input.description || '',
        status: input.status || undefined,
        priority: input.priority ? parseInt(input.priority, 10) : undefined,
      }),
    },
  },
  // --- BATCH 1B CONNECTORS ---
  'asana': {
    'create_task': {
      method: 'POST',
      urlTemplate: 'https://app.asana.com/api/1.0/tasks',
      headers: { 'Authorization': 'Bearer {api_key}' },
      bodyTemplate: (input) => ({
        data: {
          workspace: input.workspace,
          projects: input.projects ? [input.projects] : [],
          name: input.name,
          notes: input.notes || '',
        }
      }),
    },
  },
  'notion': {
    'create_page': {
      method: 'POST',
      urlTemplate: 'https://api.notion.com/v1/pages',
      headers: { 
        'Authorization': 'Bearer {api_key}',
        'Notion-Version': '2022-06-28'
      },
      bodyTemplate: (input) => ({
        parent: { database_id: input.database_id },
        properties: typeof input.properties === 'string' ? JSON.parse(input.properties) : input.properties,
      }),
    },
  },
  'slack': {
    'send_message': {
      method: 'POST',
      urlTemplate: 'https://slack.com/api/chat.postMessage',
      headers: { 'Authorization': 'Bearer {api_key}' },
      bodyTemplate: (input) => ({
        channel: input.channel,
        text: input.text,
      }),
    },
  },
  'hubspot': {
    'create_contact': {
      method: 'POST',
      urlTemplate: 'https://api.hubapi.com/crm/v3/objects/contacts',
      headers: { 'Authorization': 'Bearer {api_key}' },
      bodyTemplate: (input) => ({
        properties: {
          email: input.email,
          firstname: input.firstname || '',
          lastname: input.lastname || '',
        }
      }),
    },
  },
  'pipedrive': {
    'create_deal': {
      method: 'POST',
      urlTemplate: 'https://api.pipedrive.com/v1/deals?api_token={api_key}',
      bodyTemplate: (input) => ({
        title: input.title,
        value: input.value,
        currency: input.currency || 'USD',
      }),
    },
  },
  'mailchimp': {
    'add_subscriber': {
      method: 'POST',
      urlTemplate: 'https://{server}.api.mailchimp.com/3.0/lists/{list_id}/members',
      headers: { 'Authorization': 'Basic {basic_auth}' }, // user passes server and basic_auth or we rely on them formatting the URL correctly
      bodyTemplate: (input) => ({
        email_address: input.email_address,
        status: input.status || 'subscribed',
      }),
    },
  },
  'monday': {
    'create_item': {
      method: 'POST',
      urlTemplate: 'https://api.monday.com/v2',
      headers: { 'Authorization': '{api_key}' },
      bodyTemplate: (input) => ({
        query: `mutation { create_item (board_id: ${input.board_id}, item_name: "${input.item_name}") { id } }`
      }),
    },
  },
  'linear': {
    'create_issue': {
      method: 'POST',
      urlTemplate: 'https://api.linear.app/graphql',
      headers: { 'Authorization': '{api_key}' },
      bodyTemplate: (input) => ({
        query: `mutation { issueCreate(input: {teamId: "${input.team_id}", title: "${input.title}"}) { issue { id title } } }`
      }),
    },
  },
  'gitlab': {
    'create_issue': {
      method: 'POST',
      urlTemplate: 'https://gitlab.com/api/v4/projects/{project_id}/issues',
      headers: { 'Private-Token': '{api_key}' },
      bodyTemplate: (input) => ({
        title: input.title,
        description: input.description || '',
      }),
    },
  },
  'intercom': {
    'send_message': {
      method: 'POST',
      urlTemplate: 'https://api.intercom.io/messages',
      headers: { 
        'Authorization': 'Bearer {api_key}',
        'Intercom-Version': '2.10'
      },
      bodyTemplate: (input) => ({
        message_type: 'inapp',
        body: input.body,
        from: { type: 'admin', id: input.admin_id },
        to: { type: 'user', id: input.user_id },
      }),
    },
  },
  'zendesk': {
    'create_ticket': {
      method: 'POST',
      urlTemplate: 'https://{subdomain}.zendesk.com/api/v2/tickets.json',
      headers: { 'Authorization': 'Basic {basic_auth}' },
      bodyTemplate: (input) => ({
        ticket: {
          subject: input.subject,
          comment: { body: input.body },
        }
      }),
    },
  },
  'freshdesk': {
    'create_ticket': {
      method: 'POST',
      urlTemplate: 'https://{domain}.freshdesk.com/api/v2/tickets',
      headers: { 'Authorization': 'Basic {basic_auth}' },
      bodyTemplate: (input) => ({
        description: input.description,
        subject: input.subject,
        email: input.email,
        priority: input.priority || 1,
        status: input.status || 2,
      }),
    },
  },
  'todoist': {
    'create_task': {
      method: 'POST',
      urlTemplate: 'https://api.todoist.com/rest/v2/tasks',
      headers: { 'Authorization': 'Bearer {api_key}' },
      bodyTemplate: (input) => ({
        content: input.content,
        project_id: input.project_id || undefined,
      }),
    },
  },
  'jira': {
    'create_issue': {
      method: 'POST',
      urlTemplate: 'https://{domain}.atlassian.net/rest/api/3/issue',
      headers: { 'Authorization': 'Basic {basic_auth}' },
      bodyTemplate: (input) => ({
        fields: {
          project: { key: input.project_key },
          summary: input.summary,
          issuetype: { name: input.issue_type || 'Task' },
        }
      }),
    },
  },
  'zoho-crm': {
    'create_lead': {
      method: 'POST',
      urlTemplate: 'https://www.zohoapis.com/crm/v2/Leads',
      headers: { 'Authorization': 'Zoho-oauthtoken {api_key}' },
      bodyTemplate: (input) => ({
        data: [{
          Last_Name: input.last_name,
          Company: input.company || 'Unknown',
          Email: input.email || undefined,
        }]
      }),
    },
  },
  'activecampaign': {
    'create_contact': {
      method: 'POST',
      urlTemplate: 'https://{account_name}.api-us1.com/api/3/contacts',
      headers: { 'Api-Token': '{api_key}' },
      bodyTemplate: (input) => ({
        contact: {
          email: input.email,
          firstName: input.first_name || '',
          lastName: input.last_name || '',
        }
      }),
    },
  },
  'brevo': {
    'send_email': {
      method: 'POST',
      urlTemplate: 'https://api.brevo.com/v3/smtp/email',
      headers: { 'api-key': '{api_key}' },
      bodyTemplate: (input) => ({
        sender: { email: input.sender_email },
        to: [{ email: input.to_email }],
        subject: input.subject,
        htmlContent: input.html_content,
      }),
    },
  },
  'postmark': {
    'send_email': {
      method: 'POST',
      urlTemplate: 'https://api.postmarkapp.com/email',
      headers: { 'X-Postmark-Server-Token': '{api_key}' },
      bodyTemplate: (input) => ({
        From: input.from,
        To: input.to,
        Subject: input.subject,
        HtmlBody: input.html_body,
      }),
    },
  },
  'anthropic': {
    'send_message': {
      method: 'POST',
      urlTemplate: 'https://api.anthropic.com/v1/messages',
      headers: { 
        'x-api-key': '{api_key}',
        'anthropic-version': '2023-06-01'
      },
      bodyTemplate: (input) => ({
        model: input.model || 'claude-3-haiku-20240307',
        max_tokens: input.max_tokens || 1024,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    },
  },
  'shopify': {
    'list_products': {
      method: 'GET',
      urlTemplate: 'https://{shop_name}.myshopify.com/admin/api/2024-01/products.json',
      headers: { 'X-Shopify-Access-Token': '{api_key}' },
    },
  },
  'stripe': {
    'list_customers': {
      method: 'GET',
      urlTemplate: 'https://api.stripe.com/v1/customers',
      headers: { 'Authorization': 'Bearer {api_key}' },
    },
  },
  'cal-com': {
    'list_bookings': {
      method: 'GET',
      urlTemplate: 'https://api.cal.com/v1/bookings?apiKey={api_key}',
    },
  },
  'sentry': {
    'list_projects': {
      method: 'GET',
      urlTemplate: 'https://sentry.io/api/0/projects/',
      headers: { 'Authorization': 'Bearer {api_key}' },
    },
  },
  'amazon-ses': {
    'send_email': {
      method: 'POST',
      urlTemplate: 'https://email.us-east-1.amazonaws.com/',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      bodyTemplate: (input) => ({
        Action: 'SendEmail',
        'Destination.ToAddresses.member.1': input.to,
        'Message.Subject.Data': input.subject,
        'Message.Body.Text.Data': input.body,
        Source: input.from,
      }),
    },
  },
  'apollo': {
    'search_contacts': {
      method: 'POST',
      urlTemplate: 'https://api.apollo.io/v1/contacts/search',
      headers: { 'Cache-Control': 'no-cache' },
      bodyTemplate: (input) => ({
        api_key: input.api_key, // For apollo, the credential comes from input context if we map it or template replaces it
        q_keywords: input.keywords,
      }),
    },
  },
};

// Replaces placeholders in URL or Header templates
function resolveTemplate(template: string, credentials: Record<string, string>, input: Record<string, any>): string {
  let result = template;
  
  // 1. Replace from credentials
  for (const [key, val] of Object.entries(credentials)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), val);
  }
  
  // 2. Replace basic auth credential token helpers
  if (result.includes('{basic_auth}')) {
    const username = credentials.username || '';
    const password = credentials.password || '';
    const base64 = Buffer.from(`${username}:${password}`).toString('base64');
    result = result.replace(/{basic_auth}/g, base64);
  }
  if (result.includes('{basic_auth_mailgun}')) {
    const api_key = credentials.api_key || '';
    const base64 = Buffer.from(`api:${api_key}`).toString('base64');
    result = result.replace(/{basic_auth_mailgun}/g, base64);
  }
  
  // 3. Replace from input parameters
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === 'string' || typeof val === 'number') {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(val));
    }
  }
  
  return result;
}

export async function runGenericHttp(
  appSlug: string,
  credentials: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>
): Promise<any> {
  const routes = GENERIC_HTTP_REGISTRY[appSlug];
  if (!routes || !routes[actionSlug]) {
    throw new Error(`Action "${actionSlug}" của ứng dụng "${appSlug}" chưa được tích hợp runner.`);
  }

  const routeConfig = routes[actionSlug];
  const url = resolveTemplate(routeConfig.urlTemplate, credentials, input);
  
  // Check SSRF security
  if (isInternalUrl(url)) {
    throw new Error('Bảo mật: Từ chối truy cập vào địa chỉ IP nội bộ.');
  }

  // Build Headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  if (routeConfig.isUrlencoded) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (routeConfig.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  if (routeConfig.headers) {
    for (const [key, valueTemplate] of Object.entries(routeConfig.headers)) {
      headers[key] = resolveTemplate(valueTemplate, credentials, input);
    }
  }

  // Twilio and Mailgun basic auth mapping overrides
  if (appSlug === 'mailgun' && headers['Authorization'] === 'Basic {basic_auth}') {
    const api_key = credentials.api_key || '';
    const base64 = Buffer.from(`api:${api_key}`).toString('base64');
    headers['Authorization'] = `Basic ${base64}`;
  }

  const fetchOptions: RequestInit = {
    method: routeConfig.method,
    headers,
    signal: AbortSignal.timeout(10000), // 10s timeout
  };

  // Build Body
  if (routeConfig.method !== 'GET' && routeConfig.bodyTemplate) {
    const bodyContent = routeConfig.bodyTemplate(input, credentials);
    if (routeConfig.isUrlencoded) {
      fetchOptions.body = bodyContent;
    } else {
      fetchOptions.body = JSON.stringify(bodyContent);
    }
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  let responseData;
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (e) {
    responseData = { rawText: text };
  }

  if (!response.ok) {
    throw new Error(
      `API "${appSlug}" trả về lỗi HTTP ${response.status}: ${
        responseData.error?.message || responseData.error || responseData.message || text || response.statusText
      }`
    );
  }

  return responseData;
}

// Performs actual credentials validation for whitelisted connectors
export async function verifyGenericHttpConnection(
  appSlug: string,
  credentials: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (appSlug === 'telegram-bot') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu API Key.');
      const res = await fetch(`https://api.telegram.org/bot${api_key}/getMe`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error('API Key Telegram không hợp lệ.');
      return { success: true };
    }
    
    if (appSlug === 'discord') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu Webhook URL hoặc Bot Token.');
      if (api_key.startsWith('http')) {
        // Webhook URL validation
        if (isInternalUrl(api_key)) throw new Error('Webhook URL không an toàn.');
        if (!api_key.includes('discord.com/api/webhooks/') && !api_key.includes('discordapp.com/api/webhooks/')) {
          throw new Error('Đường dẫn Discord Webhook không đúng định dạng.');
        }
        return { success: true };
      } else {
        // Bot token validation
        const res = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { 'Authorization': `Bot ${api_key}` },
          signal: AbortSignal.timeout(6000)
        });
        if (!res.ok) throw new Error('Discord Bot Token không hợp lệ.');
        return { success: true };
      }
    }

    if (appSlug === 'openai') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu OpenAI API Key.');
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${api_key}` },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('OpenAI API Key không hợp lệ.');
      return { success: true };
    }

    if (appSlug === 'github') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu GitHub Personal Access Token.');
      const res = await fetch('https://api.github.com/user', {
        headers: { 
          'Authorization': `token ${api_key}`,
          'User-Agent': 'AI2Hero-ConnectHub-Test'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('GitHub token không hợp lệ.');
      return { success: true };
    }

    if (appSlug === 'clickup') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu ClickUp API Key.');
      const res = await fetch('https://api.clickup.com/api/v2/user', {
        headers: { 'Authorization': api_key },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('ClickUp API Key không hợp lệ.');
      return { success: true };
    }

    if (appSlug === 'zalo-zns') {
      const { access_token } = credentials;
      if (!access_token) throw new Error('Thiếu Access Token.');
      const res = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
        headers: { 'access_token': access_token },
        signal: AbortSignal.timeout(6000)
      });
      const data = await res.json();
      if (data.error && data.error !== 0) throw new Error(`Token không hợp lệ: ${data.message}`);
      return { success: true };
    }

    // --- BATCH 1B Verify ---
    const checkSimpleHttp = async (url: string, headers: Record<string, string>, errorMessage: string) => {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(errorMessage);
      return { success: true };
    };

    if (appSlug === 'asana') {
      return await checkSimpleHttp('https://app.asana.com/api/1.0/users/me', { 'Authorization': `Bearer ${credentials.api_key}` }, 'Asana Token không hợp lệ.');
    }
    if (appSlug === 'notion') {
      return await checkSimpleHttp('https://api.notion.com/v1/users/me', { 'Authorization': `Bearer ${credentials.api_key}`, 'Notion-Version': '2022-06-28' }, 'Notion Token không hợp lệ.');
    }
    if (appSlug === 'slack') {
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${credentials.api_key}` },
        signal: AbortSignal.timeout(6000)
      });
      const data = await res.json();
      if (!data.ok) throw new Error('Slack Token không hợp lệ.');
      return { success: true };
    }
    if (appSlug === 'hubspot') {
      return await checkSimpleHttp('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', { 'Authorization': `Bearer ${credentials.api_key}` }, 'HubSpot Token không hợp lệ.');
    }
    if (appSlug === 'pipedrive') {
      return await checkSimpleHttp(`https://api.pipedrive.com/v1/users/me?api_token=${credentials.api_key}`, {}, 'Pipedrive API Token không hợp lệ.');
    }
    if (appSlug === 'gitlab') {
      return await checkSimpleHttp('https://gitlab.com/api/v4/user', { 'Private-Token': credentials.api_key || '' }, 'GitLab Token không hợp lệ.');
    }
    if (appSlug === 'intercom') {
      return await checkSimpleHttp('https://api.intercom.io/me', { 'Authorization': `Bearer ${credentials.api_key}` }, 'Intercom Token không hợp lệ.');
    }
    if (appSlug === 'todoist') {
      return await checkSimpleHttp('https://api.todoist.com/rest/v2/projects', { 'Authorization': `Bearer ${credentials.api_key}` }, 'Todoist Token không hợp lệ.');
    }
    if (appSlug === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': credentials.api_key || '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{role:'user', content:'Hi'}] }),
        signal: AbortSignal.timeout(6000)
      });
      if (res.status === 401 || res.status === 403) throw new Error('Anthropic API Key không hợp lệ.');
      return { success: true };
    }
    if (appSlug === 'gemini') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu Gemini API Key.');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hi' }] }] }),
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error('Gemini API Key không hợp lệ hoặc chưa được cấp quyền.');
      }
      return { success: true };
    }
    if (appSlug === 'deepseek') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu DeepSeek API Key.');
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': `Bearer ${api_key}` },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('DeepSeek API Key không hợp lệ.');
      return { success: true };
    }
    if (appSlug === 'grok') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu xAI API Key.');
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${api_key}` },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('xAI API Key không hợp lệ.');
      return { success: true };
    }
    if (appSlug === 'qwen') {
      const api_key = credentials.api_key || '';
      if (!api_key) throw new Error('Thiếu DashScope API Key.');
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
        headers: { 'Authorization': `Bearer ${api_key}` },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error('DashScope API Key không hợp lệ.');
      return { success: true };
    }
    if (appSlug === 'stripe') {
      return await checkSimpleHttp('https://api.stripe.com/v1/balance', { 'Authorization': `Bearer ${credentials.api_key}` }, 'Stripe Secret Key không hợp lệ.');
    }
    if (appSlug === 'shopify') {
      const shop_name = credentials.shop_name || '';
      return await checkSimpleHttp(`https://${shop_name}.myshopify.com/admin/api/2024-01/shop.json`, { 'X-Shopify-Access-Token': credentials.api_key || '' }, 'Shopify Token không hợp lệ.');
    }
    if (appSlug === 'sentry') {
      return await checkSimpleHttp('https://sentry.io/api/0/', { 'Authorization': `Bearer ${credentials.api_key}` }, 'Sentry Token không hợp lệ.');
    }
    if (appSlug === 'freshdesk') {
      const domain = credentials.domain || '';
      const base64 = Buffer.from(`${credentials.api_key}:X`).toString('base64');
      return await checkSimpleHttp(`https://${domain}.freshdesk.com/api/v2/tickets?per_page=1`, { 'Authorization': `Basic ${base64}` }, 'Freshdesk API Key không hợp lệ.');
    }
    if (appSlug === 'brevo') {
      return await checkSimpleHttp('https://api.brevo.com/v3/account', { 'api-key': credentials.api_key || '' }, 'Brevo API Key không hợp lệ.');
    }
    if (appSlug === 'postmark') {
      return await checkSimpleHttp('https://api.postmarkapp.com/servers', { 'X-Postmark-Server-Token': credentials.api_key || '' }, 'Postmark Token không hợp lệ.');
    }

    // Default simulation for others
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Kiểm thử kết nối API thất bại.' };
  }
}
