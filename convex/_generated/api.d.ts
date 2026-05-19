/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _internal_count from "../_internal/count.js";
import type * as _internal_exportEmbeddings from "../_internal/exportEmbeddings.js";
import type * as _internal_listAll from "../_internal/listAll.js";
import type * as _internal_seedUsers from "../_internal/seedUsers.js";
import type * as _internal_sum from "../_internal/sum.js";
import type * as auth from "../auth.js";
import type * as config_branding from "../config/branding.js";
import type * as features_ai__schema from "../features/ai/_schema.js";
import type * as features_ai_actions from "../features/ai/actions.js";
import type * as features_ai_embedding from "../features/ai/embedding.js";
import type * as features_ai_indexing from "../features/ai/indexing.js";
import type * as features_ai_mutations from "../features/ai/mutations.js";
import type * as features_ai_queries from "../features/ai/queries.js";
import type * as features_ai_search from "../features/ai/search.js";
import type * as features_ai_toolManifest from "../features/ai/toolManifest.js";
import type * as features_audit__schema from "../features/audit/_schema.js";
import type * as features_audit_mutations from "../features/audit/mutations.js";
import type * as features_audit_queries from "../features/audit/queries.js";
import type * as features_auth__schema from "../features/auth/_schema.js";
import type * as features_auth_mutations from "../features/auth/mutations.js";
import type * as features_auth_queries from "../features/auth/queries.js";
import type * as features_closing__schema from "../features/closing/_schema.js";
import type * as features_closing_mutations from "../features/closing/mutations.js";
import type * as features_closing_queries from "../features/closing/queries.js";
import type * as features_expenses__schema from "../features/expenses/_schema.js";
import type * as features_expenses_mutations from "../features/expenses/mutations.js";
import type * as features_expenses_queries from "../features/expenses/queries.js";
import type * as features_inventory__schema from "../features/inventory/_schema.js";
import type * as features_inventory_mutations from "../features/inventory/mutations.js";
import type * as features_inventory_queries from "../features/inventory/queries.js";
import type * as features_masterData__schema from "../features/masterData/_schema.js";
import type * as features_masterData_mutations from "../features/masterData/mutations.js";
import type * as features_masterData_queries from "../features/masterData/queries.js";
import type * as features_payables__schema from "../features/payables/_schema.js";
import type * as features_payables_mutations from "../features/payables/mutations.js";
import type * as features_payables_queries from "../features/payables/queries.js";
import type * as features_pettyCash__schema from "../features/pettyCash/_schema.js";
import type * as features_pettyCash_mutations from "../features/pettyCash/mutations.js";
import type * as features_pettyCash_queries from "../features/pettyCash/queries.js";
import type * as features_reports__schema from "../features/reports/_schema.js";
import type * as features_reports_analytics from "../features/reports/analytics.js";
import type * as features_reports_bridges from "../features/reports/bridges.js";
import type * as features_reports_dashboardQueries from "../features/reports/dashboardQueries.js";
import type * as features_reports_kpiAnalytics from "../features/reports/kpiAnalytics.js";
import type * as features_reports_mutations from "../features/reports/mutations.js";
import type * as features_reports_queries from "../features/reports/queries.js";
import type * as features_sales__schema from "../features/sales/_schema.js";
import type * as features_sales_mutations from "../features/sales/mutations.js";
import type * as features_sales_queries from "../features/sales/queries.js";
import type * as http from "../http.js";
import type * as shared_auth from "../shared/auth.js";
import type * as shared_categoryInference from "../shared/categoryInference.js";
import type * as shared_helpers from "../shared/helpers.js";
import type * as shared_index from "../shared/index.js";
import type * as shared_uploadSchemas from "../shared/uploadSchemas.js";
import type * as shared_validators from "../shared/validators.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_internal/count": typeof _internal_count;
  "_internal/exportEmbeddings": typeof _internal_exportEmbeddings;
  "_internal/listAll": typeof _internal_listAll;
  "_internal/seedUsers": typeof _internal_seedUsers;
  "_internal/sum": typeof _internal_sum;
  auth: typeof auth;
  "config/branding": typeof config_branding;
  "features/ai/_schema": typeof features_ai__schema;
  "features/ai/actions": typeof features_ai_actions;
  "features/ai/embedding": typeof features_ai_embedding;
  "features/ai/indexing": typeof features_ai_indexing;
  "features/ai/mutations": typeof features_ai_mutations;
  "features/ai/queries": typeof features_ai_queries;
  "features/ai/search": typeof features_ai_search;
  "features/ai/toolManifest": typeof features_ai_toolManifest;
  "features/audit/_schema": typeof features_audit__schema;
  "features/audit/mutations": typeof features_audit_mutations;
  "features/audit/queries": typeof features_audit_queries;
  "features/auth/_schema": typeof features_auth__schema;
  "features/auth/mutations": typeof features_auth_mutations;
  "features/auth/queries": typeof features_auth_queries;
  "features/closing/_schema": typeof features_closing__schema;
  "features/closing/mutations": typeof features_closing_mutations;
  "features/closing/queries": typeof features_closing_queries;
  "features/expenses/_schema": typeof features_expenses__schema;
  "features/expenses/mutations": typeof features_expenses_mutations;
  "features/expenses/queries": typeof features_expenses_queries;
  "features/inventory/_schema": typeof features_inventory__schema;
  "features/inventory/mutations": typeof features_inventory_mutations;
  "features/inventory/queries": typeof features_inventory_queries;
  "features/masterData/_schema": typeof features_masterData__schema;
  "features/masterData/mutations": typeof features_masterData_mutations;
  "features/masterData/queries": typeof features_masterData_queries;
  "features/payables/_schema": typeof features_payables__schema;
  "features/payables/mutations": typeof features_payables_mutations;
  "features/payables/queries": typeof features_payables_queries;
  "features/pettyCash/_schema": typeof features_pettyCash__schema;
  "features/pettyCash/mutations": typeof features_pettyCash_mutations;
  "features/pettyCash/queries": typeof features_pettyCash_queries;
  "features/reports/_schema": typeof features_reports__schema;
  "features/reports/analytics": typeof features_reports_analytics;
  "features/reports/bridges": typeof features_reports_bridges;
  "features/reports/dashboardQueries": typeof features_reports_dashboardQueries;
  "features/reports/kpiAnalytics": typeof features_reports_kpiAnalytics;
  "features/reports/mutations": typeof features_reports_mutations;
  "features/reports/queries": typeof features_reports_queries;
  "features/sales/_schema": typeof features_sales__schema;
  "features/sales/mutations": typeof features_sales_mutations;
  "features/sales/queries": typeof features_sales_queries;
  http: typeof http;
  "shared/auth": typeof shared_auth;
  "shared/categoryInference": typeof shared_categoryInference;
  "shared/helpers": typeof shared_helpers;
  "shared/index": typeof shared_index;
  "shared/uploadSchemas": typeof shared_uploadSchemas;
  "shared/validators": typeof shared_validators;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
