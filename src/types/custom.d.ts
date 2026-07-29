declare module "@calcom/embed-react" {
    const Cal: React.ComponentType<any>;
    export default Cal;
    export const getCalApi: () => Promise<any>;
  }

declare module "*.png" {
  const src: string;
  export default src;
}
