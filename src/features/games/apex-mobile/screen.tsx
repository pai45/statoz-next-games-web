"use client";
import {useRouter} from 'next/navigation';
import {ApexMobileGame} from './game';
export function ApexMobile(){const router=useRouter();return <ApexMobileGame onExit={()=>router.push('/games/motorsport')}/>;}
