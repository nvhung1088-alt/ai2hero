import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';

// Mocks must be declared before importing any code under test.
// We use a global bridge to avoid Vitest hoisting Temporal Dead Zone errors with local variables.
vi.mock('../queries', () => ({
  getUser: vi.fn(),
}));

vi.mock('../../connect-hub/connector-service', () => ({
  runConnectorAction: vi.fn().mockImplementation((params) => {
    const impl = (global as any).mockRunConnectorAction;
    return impl 
      ? impl(params) 
      : Promise.resolve({ success: true, data: { message_id: '123' } });
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import * as actions from '../hero-care-actions';
import * as queries from '../queries';
import { db } from '../drizzle';
import { teams, users, teamMembers, heroCareInboxes, heroCareScripts, heroCareSnapshots, heroCareCustomers, heroCareConversations, heroCareMessages, connectHubConnections, activityLogs } from '../schema';
import { eq, inArray } from 'drizzle-orm';
import { CreateInboxInput, CreateScriptInput, CreateSnapshotInput } from '../hero-care-actions';

describe('Hero Care Server Actions CRUD & Security', () => {
  let testUserId: number;
  let testTeamId: number;
  let unauthorizedUserId: number;
  let unauthorizedTeamId: number;
  let noAppTeamId: number;

  beforeAll(async () => {
    // 1. Create a test user (Authorized)
    const [user] = await db.insert(users).values({
      email: `auth_test_${Date.now()}@ai2hero.local`,
      name: 'Test User Authorized',
      passwordHash: 'dummy',
    }).returning({ id: users.id });
    testUserId = user.id;

    // 2. Create an unauthorized user
    const [unauthUser] = await db.insert(users).values({
      email: `unauth_test_${Date.now()}@ai2hero.local`,
      name: 'Test User Unauthorized',
      passwordHash: 'dummy',
    }).returning({ id: users.id });
    unauthorizedUserId = unauthUser.id;

    // 3. Create a test team with hero-care activated
    const [team] = await db.insert(teams).values({
      name: 'Test Team Hero Care',
      stripeCustomerId: `cus_test_${Date.now()}`,
      activatedApps: ['hero-care', 'chat'],
    }).returning({ id: teams.id });
    testTeamId = team.id;

    // 4. Create a test team without hero-care activated (Wait, for IDOR cross-team check, we need hero-care activated to pass the app check)
    const [unauthTeam] = await db.insert(teams).values({
      name: 'Test Team No Hero Care',
      stripeCustomerId: `cus_unauth_${Date.now()}`,
      activatedApps: ['chat', 'hero-care'], // Added hero-care to test cross-team IDOR properly
    }).returning({ id: teams.id });
    unauthorizedTeamId = unauthTeam.id;

    // 4.5. Create a test team specifically for testing app not activated
    const [noAppTeamInserted] = await db.insert(teams).values({
      name: 'Test Team App Not Activated',
      stripeCustomerId: `cus_noapp_${Date.now()}`,
      activatedApps: ['chat'], // No hero-care
    }).returning({ id: teams.id });
    noAppTeamId = noAppTeamInserted.id;

    // 5. Add Authorized user to the Authorized team
    await db.insert(teamMembers).values({
      teamId: testTeamId,
      userId: testUserId,
      role: 'owner',
    });

    // 6. Add Authorized user to Unauthorized team and NoAppTeam
    await db.insert(teamMembers).values({
      teamId: unauthorizedTeamId,
      userId: testUserId,
      role: 'owner',
    });
    await db.insert(teamMembers).values({
      teamId: noAppTeamId,
      userId: testUserId,
      role: 'owner',
    });
  });

  afterAll(async () => {
    // Cleanup everything
    if (testTeamId || unauthorizedTeamId || noAppTeamId) {
      await db.delete(activityLogs).where(inArray(activityLogs.teamId, [testTeamId, unauthorizedTeamId, noAppTeamId]));
      await db.delete(heroCareCustomers).where(eq(heroCareCustomers.teamId, testTeamId));
      await db.delete(heroCareSnapshots).where(eq(heroCareSnapshots.teamId, testTeamId));
      await db.delete(heroCareScripts).where(eq(heroCareScripts.teamId, testTeamId));
      await db.delete(heroCareInboxes).where(eq(heroCareInboxes.teamId, testTeamId));
      await db.delete(teamMembers).where(inArray(teamMembers.teamId, [testTeamId, unauthorizedTeamId, noAppTeamId]));
      await db.delete(teams).where(inArray(teams.id, [testTeamId, unauthorizedTeamId, noAppTeamId]));
    }
    if (testUserId) {
      await db.delete(users).where(inArray(users.id, [testUserId, unauthorizedUserId]));
    }
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('IDOR & Security Tests', () => {
    it('should throw Error if user is not logged in', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(null);
      const res = await actions.getInboxesAction(testTeamId);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Chưa đăng nhập');
    });

    it('should throw Error if user does not belong to the team', async () => {
      // Setup mock to return the unauthorized user
      vi.mocked(queries.getUser).mockResolvedValue({ id: unauthorizedUserId } as any);
      const res = await actions.getInboxesAction(testTeamId);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Không có quyền truy cập Không gian làm việc này');
    });

    it('should throw Error if hero-care app is not activated for the team', async () => {
      // Setup mock to return the authorized user, but accessing a team without hero-care
      vi.mocked(queries.getUser).mockResolvedValue({ id: testUserId } as any);
      const res = await actions.getInboxesAction(noAppTeamId);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Ứng dụng Hero Care chưa được kích hoạt trong Không gian này');
    });
  });

  describe('Inbox CRUD Actions', () => {
    let createdInboxId: number;

    beforeEach(() => {
      vi.mocked(queries.getUser).mockResolvedValue({ id: testUserId } as any);
    });

    it('should create an Inbox successfully', async () => {
      const inboxData: CreateInboxInput = {
        name: 'Test Inbox',
        channel: 'web',
        status: 'active',
        defaultReply: 'Hello from test',
        dailyMessageLimit: 50,
        dailyAiCallLimit: 20,
      };

      const res = await actions.createInboxAction(testTeamId, inboxData);
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data!.name).toBe('Test Inbox');
      createdInboxId = res.data!.id;
    });

    it('should get Inboxes successfully', async () => {
      const res = await actions.getInboxesAction(testTeamId);
      expect(res.success).toBe(true);
      expect(res.data).toBeInstanceOf(Array);
      expect(res.data!.length).toBeGreaterThan(0);
      expect(res.data!.some((i: any) => i.id === createdInboxId)).toBe(true);
    });

    it('should update an Inbox successfully', async () => {
      const res = await actions.updateInboxAction(testTeamId, createdInboxId, { name: 'Updated Inbox' });
      expect(res.success).toBe(true);
      expect(res.data!.name).toBe('Updated Inbox');
    });

    it('should prevent updating Inbox from another team (IDOR)', async () => {
      // Even if user is authorized for unauthorizedTeamId, the inbox belongs to testTeamId
      // Attempting to update the inbox but specifying a different teamId
      const res = await actions.updateInboxAction(unauthorizedTeamId, createdInboxId, { name: 'Hack Inbox' });
      // The update query will not find the inbox because it checks both inboxId AND teamId
      expect(res.success).toBe(false);
      expect(res.error).toBe('Không tìm thấy Inbox');
    });

    it('should delete (soft delete) an Inbox successfully', async () => {
      const res = await actions.deleteInboxAction(testTeamId, createdInboxId);
      expect(res.success).toBe(true);
      expect(res.data!.status).toBe('deleted');
      
      // Verify it no longer appears in get
      const getRes = await actions.getInboxesAction(testTeamId);
      expect(getRes.data!.some((i: any) => i.id === createdInboxId)).toBe(false);
    });
  });

  describe('Script CRUD Actions', () => {
    let createdScriptId: number;

    beforeEach(() => {
      vi.mocked(queries.getUser).mockResolvedValue({ id: testUserId } as any);
    });

    it('should create a Script successfully', async () => {
      const scriptData: CreateScriptInput = {
        triggerText: 'Price of product?',
        replyText: 'It is $10.',
        status: 'active',
        confidenceThreshold: 70,
        keywords: [],
        negativeKeywords: [],
        triggerExamples: [],
      };

      const res = await actions.createScriptAction(testTeamId, scriptData);
      expect(res.success).toBe(true);
      expect(res.data!.triggerText).toBe('Price of product?');
      createdScriptId = res.data!.id;
    });

    it('should get Scripts successfully', async () => {
      const res = await actions.getScriptsAction(testTeamId);
      expect(res.success).toBe(true);
      expect(res.data!.length).toBeGreaterThan(0);
    });

    it('should update a Script successfully', async () => {
      const res = await actions.updateScriptAction(testTeamId, createdScriptId, { confidenceThreshold: 80 });
      expect(res.success).toBe(true);
      expect(res.data!.confidenceThreshold).toBe(80);
    });

    it('should delete a Script successfully', async () => {
      const res = await actions.deleteScriptAction(testTeamId, createdScriptId);
      expect(res.success).toBe(true);
      expect(res.data!.status).toBe('deleted');
    });
  });

  describe('Snapshot CRUD Actions', () => {
    let createdSnapshotId: number;
    // We need an inbox ID for snapshot
    let testInboxId: number;

    beforeAll(async () => {
      const [inbox] = await db.insert(heroCareInboxes).values({
        teamId: testTeamId,
        name: 'Temp Inbox',
        channel: 'web',
        defaultReply: 'Hello',
        dailyMessageLimit: 10,
        dailyAiCallLimit: 10,
      }).returning({ id: heroCareInboxes.id });
      testInboxId = inbox.id;
    });

    beforeEach(() => {
      vi.mocked(queries.getUser).mockResolvedValue({ id: testUserId } as any);
    });

    it('should create a Snapshot successfully', async () => {
      const snapData: CreateSnapshotInput = {
        inboxId: testInboxId,
        name: 'Product Inventory',
        dataType: 'products',
        refreshIntervalMinutes: 15,
        maxStaleMinutes: 60,
        allowStaleFallback: 1,
        status: 'active',
      };

      const res = await actions.createSnapshotAction(testTeamId, snapData);
      expect(res.success).toBe(true);
      expect(res.data!.name).toBe('Product Inventory');
      createdSnapshotId = res.data!.id;
    });

    it('should get Snapshots successfully', async () => {
      const res = await actions.getSnapshotsAction(testTeamId);
      expect(res.success).toBe(true);
      expect(res.data!.length).toBeGreaterThan(0);
    });

    it('should update a Snapshot successfully', async () => {
      const res = await actions.updateSnapshotAction(testTeamId, createdSnapshotId, { name: 'Updated Inventory' });
      expect(res.success).toBe(true);
      expect(res.data!.name).toBe('Updated Inventory');
    });

    it('should delete a Snapshot successfully', async () => {
      const res = await actions.deleteSnapshotAction(testTeamId, createdSnapshotId);
      expect(res.success).toBe(true);
      expect(res.data!.status).toBe('deleted');
    });
  });

  describe('Message Actions (Task 3.3)', () => {
    let testInboxId: number;
    let testCustomerId: number;
    let testConvId: number;
    let testDraftMessageId: number;
    let testConnectionId: number;

    beforeAll(async () => {
      // 0. Setup mock Connection first to respect foreign key constraint
      const [conn] = await db.insert(connectHubConnections).values({
        teamId: testTeamId,
        userId: testUserId,
        connectionName: 'Mock Message Delivery Connection',
        appSlug: 'facebook',
        appName: 'Meta Platform',
        authType: 'bearer_token',
        status: 'connected',
        encryptedCredentials: 'DummyCredentialsEncrypted',
      }).returning({ id: connectHubConnections.id });
      testConnectionId = conn.id;

      // Setup mock Inbox, Customer, Conversation, and a Draft Message for testing
      const [inbox] = await db.insert(heroCareInboxes).values({
        teamId: testTeamId,
        name: 'Message Test Inbox',
        channel: 'facebook',
        connectionId: testConnectionId, // Reference the valid connection ID
        defaultReply: 'Robot reply',
        dailyMessageLimit: 10,
        dailyAiCallLimit: 10,
      }).returning({ id: heroCareInboxes.id });
      testInboxId = inbox.id;

      const [cust] = await db.insert(heroCareCustomers).values({
        teamId: testTeamId,
        externalCustomerId: 'fb-cust-123',
        channel: 'facebook',
        name: 'FB Customer',
      }).returning({ id: heroCareCustomers.id });
      testCustomerId = cust.id;

      const [conv] = await db.insert(heroCareConversations).values({
        teamId: testTeamId,
        inboxId: testInboxId,
        externalConversationId: 'fb-conv-456',
        customerId: testCustomerId,
        chatMode: 'hybrid',
        status: 'active',
      }).returning({ id: heroCareConversations.id });
      testConvId = conv.id;

      const [draftMsg] = await db.insert(heroCareMessages).values({
        teamId: testTeamId,
        inboxId: testInboxId,
        conversationId: testConvId,
        senderId: 'bot-ai',
        senderName: 'AI Bot',
        direction: 'outbound',
        messageType: 'text',
        content: 'Proposed AI Reply',
        draftContent: 'Proposed AI Reply',
        draftStatus: 'pending',
      }).returning({ id: heroCareMessages.id });
      testDraftMessageId = draftMsg.id;
    });

    afterAll(async () => {
      // Clean up mock data
      await db.delete(heroCareMessages).where(eq(heroCareMessages.conversationId, testConvId));
      await db.delete(heroCareConversations).where(eq(heroCareConversations.id, testConvId));
      await db.delete(heroCareCustomers).where(eq(heroCareCustomers.id, testCustomerId));
      await db.delete(heroCareInboxes).where(eq(heroCareInboxes.id, testInboxId));
      if (testConnectionId) {
        await db.delete(connectHubConnections).where(eq(connectHubConnections.id, testConnectionId));
      }
      delete (global as any).mockRunConnectorAction;
    });

    beforeEach(async () => {
      vi.mocked(queries.getUser).mockResolvedValue({ id: testUserId, name: 'Test User Authorized' } as any);
      
      // Re-apply mockImplementation because the outer beforeEach calls vi.resetAllMocks()
      const { runConnectorAction } = await import('../../connect-hub/connector-service');
      vi.mocked(runConnectorAction).mockImplementation((params) => {
        const impl = (global as any).mockRunConnectorAction;
        return impl 
          ? impl(params) 
          : Promise.resolve({ success: true, data: { message_id: '123' } });
      });

      (global as any).mockRunConnectorAction = vi.fn().mockResolvedValue({ success: true, data: { message_id: '123' } });
    });

    it('should send a manual message successfully', async () => {
      const res = await actions.sendManualMessageAction(testTeamId, testConvId, 'Hello from Agent');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data!.content).toBe('Hello from Agent');
      expect(res.data!.direction).toBe('outbound');
      expect(res.data!.senderId).toBe(`agent-${testUserId}`);

      // Verify conversation lastMessageAt was updated
      const conv = await db.query.heroCareConversations.findFirst({
        where: eq(heroCareConversations.id, testConvId),
      });
      expect(conv).toBeDefined();
      expect(conv!.lastMessageAt).toBeDefined();
    });

    it('should approve a draft message successfully', async () => {
      const res = await actions.approveDraftAction(testTeamId, testDraftMessageId);
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data!.draftStatus).toBe('approved');
      expect(res.data!.content).toBe('Proposed AI Reply');

      // Verify conversation lastMessageAt was updated
      const conv = await db.query.heroCareConversations.findFirst({
        where: eq(heroCareConversations.id, testConvId),
      });
      expect(conv).toBeDefined();
      expect(conv!.lastMessageAt).toBeDefined();
    });

    it('should return error when deliverMessage fails in sendManualMessageAction', async () => {
      // Mock runConnectorAction to fail
      (global as any).mockRunConnectorAction.mockResolvedValueOnce({ success: false, error: 'API Connection Error' });

      const res = await actions.sendManualMessageAction(testTeamId, testConvId, 'Hello Fail Message');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Gửi tin nhắn qua API kênh gốc thất bại');
      expect(res.data).toBeDefined(); // Message is still created in DB
    });
  });
});
