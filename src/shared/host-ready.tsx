'use client';
import {useEffect} from 'react';
export function HostReady(){useEffect(()=>{if(parent!==window)parent.postMessage({type:'statoz:host-ready',protocol:1,host:'next-games-web'},'*');},[]);return null;}
