import { Router, type IRouter } from "express";
import {
  GetCostguardCacheResponse,
  GetCostguardOverviewResponse,
  GetCostguardPlanParams,
  GetCostguardPlanResponse,
  GetCostguardPlansResponse,
  GetCostguardPricingResponse,
  GetCostguardPolicyResponse,
  GetCostguardReportsResponse,
  GetCostguardResourcesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const trend = [
  { label: "Apr 01", cost: 10860, budget: 12000 },
  { label: "Apr 08", cost: 11240, budget: 12000 },
  { label: "Apr 15", cost: 11820, budget: 12000 },
  { label: "Apr 22", cost: 11940, budget: 12000 },
  { label: "Apr 29", cost: 12480, budget: 12500 },
  { label: "May 06", cost: 12140, budget: 12500 },
  { label: "May 13", cost: 12680, budget: 12500 },
  { label: "May 20", cost: 12470, budget: 12500 },
];

const plans = [
  {
    id: "plan-482",
    name: "production-networking",
    branch: "feat/private-endpoints",
    author: "Maya Chen",
    status: "blocked" as const,
    createdAt: "12 min ago",
    resources: 14,
    currentCost: 12470,
    proposedCost: 13240,
    delta: 770,
    duration: "2m 14s",
  },
  {
    id: "plan-481",
    name: "data-platform",
    branch: "main",
    author: "Ethan Walker",
    status: "passed" as const,
    createdAt: "1h ago",
    resources: 8,
    currentCost: 11690,
    proposedCost: 11820,
    delta: 130,
    duration: "1m 48s",
  },
  {
    id: "plan-480",
    name: "observability-stack",
    branch: "chore/retention-policy",
    author: "Priya Shah",
    status: "passed" as const,
    createdAt: "3h ago",
    resources: 21,
    currentCost: 10980,
    proposedCost: 11040,
    delta: 60,
    duration: "3m 02s",
  },
  {
    id: "plan-479",
    name: "shared-services",
    branch: "fix/sku-upgrade",
    author: "Noah Kim",
    status: "passed" as const,
    createdAt: "Yesterday",
    resources: 6,
    currentCost: 10840,
    proposedCost: 10840,
    delta: 0,
    duration: "54s",
  },
  {
    id: "plan-478",
    name: "customer-api",
    branch: "feat/geo-replication",
    author: "Sofia Garcia",
    status: "blocked" as const,
    createdAt: "Yesterday",
    resources: 17,
    currentCost: 10120,
    proposedCost: 11480,
    delta: 1360,
    duration: "2m 38s",
  },
];

const resources = [
  {
    id: "res-01",
    name: "pe-prod-orders",
    type: "Microsoft.Network/privateEndpoints",
    region: "East US 2",
    action: "create" as const,
    currentCost: 0,
    proposedCost: 7.3,
    delta: 7.3,
    confidence: 99,
  },
  {
    id: "res-02",
    name: "aks-prod-system",
    type: "Microsoft.ContainerService/managedClusters",
    region: "East US 2",
    action: "update" as const,
    currentCost: 1520,
    proposedCost: 2040,
    delta: 520,
    confidence: 97,
  },
  {
    id: "res-03",
    name: "sql-orders-primary",
    type: "Microsoft.Sql/servers/databases",
    region: "West Europe",
    action: "update" as const,
    currentCost: 2180,
    proposedCost: 2380,
    delta: 200,
    confidence: 95,
  },
  {
    id: "res-04",
    name: "stplatformlogs",
    type: "Microsoft.Storage/storageAccounts",
    region: "East US 2",
    action: "no-change" as const,
    currentCost: 148,
    proposedCost: 148,
    delta: 0,
    confidence: 100,
  },
  {
    id: "res-05",
    name: "redis-session-cache",
    type: "Microsoft.Cache/Redis",
    region: "Central US",
    action: "delete" as const,
    currentCost: 86,
    proposedCost: 0,
    delta: -86,
    confidence: 98,
  },
  {
    id: "res-06",
    name: "appgw-prod",
    type: "Microsoft.Network/applicationGateways",
    region: "East US 2",
    action: "update" as const,
    currentCost: 462,
    proposedCost: 591,
    delta: 129,
    confidence: 93,
  },
];

const pricing = [
  {
    id: "price-01",
    service: "Azure Kubernetes Service",
    sku: "Standard D4s v5",
    region: "East US 2",
    unit: "1 hour",
    price: 0.192,
    currency: "USD",
    syncedAt: "12 min ago",
    cacheStatus: "fresh" as const,
  },
  {
    id: "price-02",
    service: "Azure SQL Database",
    sku: "Business Critical Gen5 4 vCores",
    region: "West Europe",
    unit: "1 hour",
    price: 2.266,
    currency: "USD",
    syncedAt: "12 min ago",
    cacheStatus: "fresh" as const,
  },
  {
    id: "price-03",
    service: "Azure Cache for Redis",
    sku: "Premium P1",
    region: "Central US",
    unit: "1 hour",
    price: 0.752,
    currency: "USD",
    syncedAt: "12 min ago",
    cacheStatus: "fresh" as const,
  },
  {
    id: "price-04",
    service: "Virtual Network",
    sku: "Private Endpoint",
    region: "East US 2",
    unit: "1 hour",
    price: 0.01,
    currency: "USD",
    syncedAt: "Yesterday",
    cacheStatus: "stale" as const,
  },
  {
    id: "price-05",
    service: "Application Gateway",
    sku: "Standard_v2",
    region: "East US 2",
    unit: "1 hour",
    price: 0.246,
    currency: "USD",
    syncedAt: "12 min ago",
    cacheStatus: "fresh" as const,
  },
];

const reports = [
  {
    id: "report-01",
    name: "May infrastructure impact",
    period: "May 01 — May 31, 2026",
    totalCost: 12470,
    delta: 310,
    status: "reviewed" as const,
    generatedAt: "May 28, 2026",
  },
  {
    id: "report-02",
    name: "Private endpoint rollout",
    period: "May 20, 2026",
    totalCost: 13240,
    delta: 770,
    status: "blocked" as const,
    generatedAt: "May 20, 2026",
  },
  {
    id: "report-03",
    name: "April infrastructure impact",
    period: "Apr 01 — Apr 30, 2026",
    totalCost: 12140,
    delta: 220,
    status: "passed" as const,
    generatedAt: "Apr 30, 2026",
  },
];

router.get("/costguard/overview", (_req, res) => {
  res.json(
    GetCostguardOverviewResponse.parse({
      monthlyCost: 12470,
      monthlyDelta: 310,
      plansAnalyzed: 128,
      passRate: 94.5,
      budgetLimit: 12500,
      budgetUsed: 12470,
      lastSynced: "12 minutes ago",
      costTrend: trend,
      recentActivity: [
        {
          id: "activity-01",
          title: "Deployment blocked",
          detail: "production-networking exceeded the monthly delta guardrail",
          status: "blocked",
          timestamp: "12 min ago",
        },
        {
          id: "activity-02",
          title: "Plan approved",
          detail: "data-platform passed with a $130 monthly impact",
          status: "passed",
          timestamp: "1 hour ago",
        },
        {
          id: "activity-03",
          title: "Pricing cache synced",
          detail: "2,418 Azure retail price points refreshed",
          status: "synced",
          timestamp: "2 hours ago",
        },
        {
          id: "activity-04",
          title: "Resources analyzed",
          detail: "observability-stack extracted 21 resources",
          status: "analyzed",
          timestamp: "3 hours ago",
        },
      ],
    }),
  );
});

router.get("/costguard/plans", (_req, res) => {
  res.json(GetCostguardPlansResponse.parse(plans));
});

router.get("/costguard/plans/:planId", (req, res) => {
  const { planId } = GetCostguardPlanParams.parse(req.params);
  const plan = plans.find((item) => item.id === planId);
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(GetCostguardPlanResponse.parse(plan));
});

router.get("/costguard/resources", (_req, res) => {
  res.json(GetCostguardResourcesResponse.parse(resources));
});

router.get("/costguard/pricing", (_req, res) => {
  res.json(GetCostguardPricingResponse.parse(pricing));
});

router.get("/costguard/cache", (_req, res) => {
  res.json(
    GetCostguardCacheResponse.parse({
      engine: "SQLite 3.45",
      status: "healthy",
      entries: 2418,
      hitRate: 98.7,
      lastRefresh: "12 minutes ago",
      size: "4.8 MB",
    }),
  );
});

router.get("/costguard/policy", (_req, res) => {
  res.json(
    GetCostguardPolicyResponse.parse({
      name: "production-guardrail",
      monthlyLimit: 12500,
      deltaLimit: 500,
      enforcement: "block",
      window: "Monthly",
      updatedAt: "May 24, 2026",
    }),
  );
});

router.get("/costguard/reports", (_req, res) => {
  res.json(GetCostguardReportsResponse.parse(reports));
});

export default router;