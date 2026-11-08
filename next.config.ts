import type {NextConfig} from 'next';
const config:NextConfig={transpilePackages:['@statoz/design-system','@statoz/game-engine'],images:{unoptimized:true},...(process.env.GITHUB_PAGES==='true'?{output:'export',trailingSlash:true,basePath:process.env.NEXT_PUBLIC_BASE_PATH||''}:{}),devIndicators:false};
export default config;
