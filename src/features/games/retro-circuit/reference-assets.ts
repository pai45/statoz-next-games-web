import data from './reference-data';
export type ReferenceAsset={id:string;file:string;width:number;height:number;anchor:[number,number];[key:string]:unknown};
export const referenceImages=new Map<string,HTMLImageElement>();
export const referenceManifest=data.manifest as unknown as {assets:ReferenceAsset[]};
let loading:Promise<void>|null=null;
export function loadReferenceAssets(){if(!loading)loading=Promise.all(referenceManifest.assets.map(async a=>{const image=new Image();image.src=data.images[a.id as keyof typeof data.images];await image.decode();referenceImages.set(a.id,image);})).then(()=>{}).catch(e=>{loading=null;referenceImages.clear();throw e;});return loading;}
export function refImage(id:string){const image=referenceImages.get(id);if(!image)throw Error('Missing reference asset '+id);return image;}
