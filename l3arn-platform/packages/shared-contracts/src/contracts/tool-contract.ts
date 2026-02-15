/**
 * Tool Contract type — defines the shape of a tool's interface.
 *
 * Every tool in the system has a JSON contract that follows this schema.
 * Contracts are the source of truth for tool input/output validation.
 */
import { z } from 'zod';

export const JsonSchemaPropertySchema = z.object({
    type: z.string(),
    description: z.string().optional(),
});

export const ToolContractSchema = z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    input: z.object({
        type: z.literal('object'),
        required: z.array(z.string()),
        properties: z.record(JsonSchemaPropertySchema),
    }),
    output: z.object({
        type: z.literal('object'),
        properties: z.record(JsonSchemaPropertySchema),
    }),
    audit: z.object({
        log_input: z.boolean(),
        log_output: z.boolean(),
        requires_tenant: z.boolean(),
    }),
});

export type ToolContract = z.infer<typeof ToolContractSchema>;
