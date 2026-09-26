import { handleApi, type Env } from "../../worker/api";

export const onRequest = (context: { request: Request; env: Env }) => handleApi(context.request, context.env);
