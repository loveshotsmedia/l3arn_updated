/**
 * @l3arn/shared-types — Mappers
 *
 * DB ↔ Domain mappers for all tables where the Zod schema field names
 * differ from the DB column names. Import from this barrel to avoid
 * reaching into individual mapper files.
 *
 * Usage: import { moolahLedgerEntryToDb, dbRowToMoolahLedgerEntry } from "@l3arn/shared-types/mappers";
 * (or via the root index: import { ... } from "@l3arn/shared-types")
 */

export * from "./moolah-ledger.mapper";
