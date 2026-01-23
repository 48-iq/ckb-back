import { Provider } from "@nestjs/common";
import { FunctionsService } from "../services/functions.service";
import { State } from "../agent.state";
import { ConfigService } from "@nestjs/config";

export const FUNCTIONS_NODE = 'FUNCTIONS_NODE';

export const FunctionsNodeProvider: Provider = {
  provide: FUNCTIONS_NODE,
  inject: [FunctionsService, ConfigService],
  useFactory: (
    functionsService: FunctionsService
  ) => {
    return async (state: typeof State.State) => {
      const { messages } = state;
      const lastMessage = messages.at(-1);
      if (lastMessage?.function_call !== undefined) {
        const result = await functionsService.useFunctionByName(
          lastMessage.function_call.name,
          lastMessage.function_call.arguments
        );
        
        return { messages: [...messages, { role: "function", content: JSON.stringify(result) }] };
      }
      return { messages };
    }
  }
};