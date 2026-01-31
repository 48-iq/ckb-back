import { Logger, Provider } from "@nestjs/common";
import { State } from "../agent.state";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { GIGACHAT } from "src/gigachat/gigachat.provider";
import GigaChat from "gigachat";
import { ResultCustomChunk } from "src/chat/chunks/result.custom.chunk";
import { MessageRole } from "gigachat/interfaces";

function getRoleText (role: MessageRole) {
  switch (role) {
    case 'system':
      return '=====SYSTEM PROMPT=====\n';
    case 'user':
      return '=====USER MESSAGE=====\n';
    case 'assistant':
      return '=====PREVIOUS AGENT MESSAGE=====\n';
    case 'function':
      return '=====FUNCTION CALL RESULT=====\n';
    default:
      return '';
  }
}


export const RESULT_NODE = 'RESULT_NODE';
const logger = new Logger("ResultNodeProvider");
export const ResultNodeProvider: Provider = {
  provide: RESULT_NODE,
  inject: [GIGACHAT],
  useFactory: (model: GigaChat) => {
    return async (state: typeof State.State, config: LangGraphRunnableConfig) => {
      
      const { messages, totalTokens } = state;
      let text = '';
      const previousAgentMessages = messages.map((message) => {
        const functionCall = message.function_call;
        let content = `${getRoleText(message.role)}${message.content}`;
        if (functionCall) {
          content = `${content} \n =====function call=====\n ${JSON.stringify(functionCall)}`;
        }
        return { 
          role: "user", 
          content
        };
      });
      for await (let chunk of model.stream({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...previousAgentMessages,
        ],
        temperature: 0,
      })) {
        if (config.signal?.aborted) return;
        const textUpdate = chunk.choices[0]?.delta.content||'';
        text += textUpdate;
        logger.log(`result chunk: ${textUpdate}`);
        if (config.writer) {
          config.writer(new ResultCustomChunk({ type: 'result', text, textUpdate }));
        }
      }
      logger.log('after result');
      const tokensResp = await model.tokensCount([
        SYSTEM_PROMPT, 
        ...(messages.map((message) => message.content??'')),
        text
      ]);
      let resultTokens = 0;
      for (const token of tokensResp.tokens) {
        resultTokens += token.tokens;
      }
      const newTotalTokens = totalTokens + resultTokens;
      logger.log(`result: ${text}`);
      return { result: text,  totalTokens: newTotalTokens };
    }
  }
}

const SYSTEM_PROMPT = `
###
Ты агент в мультиагентной системе.
Предыдущий агент ответил на вопрос пользователя, используя графовую сеть знаний и инструменты, 
но его ответ может включать упоминание графа, id узлов, название инструментов, 
фразы "на основе предоставленных данных" или "с помощью полученной информации", упоминание агента и т.д.

Твоя задача лаконично ответить пользователю, перефразируя ответ предыдущего агента, словно ты общаешься с ним в чате, 
не упоминая граф, id узлов, название инструментов, плана запроса, фразы "на основе предоставленных данных" или 
"с помощью полученной информации" и т.д.

###
Не выдумывай информацию, строго следуй заданному формату.
`;