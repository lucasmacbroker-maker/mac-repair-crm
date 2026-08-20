declare module "@react-pdf/renderer" {
  import React from "react";
  export const Document: React.FC<{ children?: React.ReactNode }>;
  export const Page: React.FC<{ size?: string; style?: object; children?: React.ReactNode }>;
  export const Text: React.FC<{ style?: object | object[]; children?: React.ReactNode }>;
  export const View: React.FC<{ style?: object | object[]; children?: React.ReactNode }>;
  export const Image: React.FC<{ src: string; style?: object }>;
  export namespace StyleSheet {
    function create<T extends object>(styles: T): T;
  }
  export function renderToBuffer(element: React.ReactElement): Promise<Buffer>;
}
