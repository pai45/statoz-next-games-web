"use client";
import {useCallback,useEffect,useRef} from "react";
import type {HoopsInput} from "./input";
import {joystickVector} from "./joystick-math";
import styles from "./screen.module.css";

/** One pointer owns the stick; action buttons retain their own pointers. */
export function HoopsJoystick({input,disabled}:{input:()=>Pick<HoopsInput,"stick"|"up">|null;disabled:boolean}){
  const root=useRef<HTMLDivElement>(null),pointer=useRef<number|null>(null);
  const reset=useCallback(()=>{
    const id=pointer.current;pointer.current=null;
    if(id!==null)input()?.up("stick"+id);
    const element=root.current;if(!element)return;
    delete element.dataset.held;element.dataset.x="0";element.dataset.y="0";
    element.style.setProperty("--stick-x","0px");element.style.setProperty("--stick-y","0px");
    if(id!==null&&element.hasPointerCapture(id))element.releasePointerCapture(id);
  },[input]);
  useEffect(()=>{if(disabled)reset();},[disabled,reset]);
  useEffect(()=>()=>reset(),[reset]);
  const move=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(disabled||pointer.current!==e.pointerId)return;
    const r=e.currentTarget.getBoundingClientRect(),radius=r.width*.31;
    const value=joystickVector(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,radius);
    input()?.stick("stick"+e.pointerId,value.x,value.y);
    e.currentTarget.dataset.x=value.x.toFixed(3);e.currentTarget.dataset.y=value.y.toFixed(3);
    e.currentTarget.style.setProperty("--stick-x",value.thumbX+"px");e.currentTarget.style.setProperty("--stick-y",value.thumbY+"px");
  };
  return <div ref={root} className={styles.joystick} data-hoops-stick data-x="0" data-y="0" role="group" aria-label="Movement joystick" aria-disabled={disabled} onContextMenu={e=>e.preventDefault()}
    onPointerDown={e=>{if(disabled||pointer.current!==null||e.button!==0)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.held="true";move(e);}}
    onPointerMove={move} onPointerUp={e=>{if(pointer.current===e.pointerId)reset();}} onPointerCancel={e=>{if(pointer.current===e.pointerId)reset();}} onLostPointerCapture={e=>{if(pointer.current===e.pointerId)reset();}}>
    <span className={styles.stickCross} aria-hidden="true"/><span className={styles.stickThumb} aria-hidden="true"/>
  </div>;
}
