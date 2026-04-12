import { useEffect, useRef, useCallback, useState } from "react";

type WSMessage = {
  type: string;
  data: any;
};

type MessageHandler = (msg: WSMessage) => void;

let sharedWs: WebSocket | null = null;
let sharedHandlers = new Set<MessageHandler>();
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let refCount = 0;
let closedManually = false;

function connectShared() {
  if (closedManually) return;
  if (sharedWs?.readyState === WebSocket.OPEN || sharedWs?.readyState === WebSocket.CONNECTING) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WSMessage;
      for (const handler of sharedHandlers) {
        handler(msg);
      }
    } catch {}
  };

  ws.onclose = () => {
    sharedWs = null;
    if (!closedManually && refCount > 0) {
      reconnectTimer = setTimeout(connectShared, 3000);
    }
  };

  ws.onerror = () => {
    ws.close();
  };

  sharedWs = ws;
}

function disconnectShared() {
  closedManually = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  sharedWs?.close();
  sharedWs = null;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    refCount++;
    closedManually = false;
    connectShared();

    const checkInterval = setInterval(() => {
      setConnected(sharedWs?.readyState === WebSocket.OPEN);
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      refCount--;
      if (refCount <= 0) {
        refCount = 0;
        disconnectShared();
      }
    };
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    sharedHandlers.add(handler);
    return () => {
      sharedHandlers.delete(handler);
    };
  }, []);

  return { connected, subscribe };
}
