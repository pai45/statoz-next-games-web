import type { Command, Direction } from './contracts';
import type { FootballSession } from './session';
import {padDirections} from './touch-pad';
export function bindInput(container: HTMLElement, session: FootballSession) {
    const controller = new AbortController(), options = { signal: controller.signal }, keys: Record<string, Direction> = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down' };
    type ActionType=Exclude<Command['type'],'hold'>;
    document.addEventListener('keydown', e => {
        if ((e.target as HTMLElement)?.matches('input,select,textarea'))
            return;
        if (e.key === 'Escape' && !e.repeat) {
            e.preventDefault();
            session.dispatch({ type: 'pause' });
            return;
        }
        const direction = keys[e.key.toLowerCase()];
        if (direction) {
            e.preventDefault();
            session.dispatch({ type: 'hold', key: direction, value: true, source: 'keyboard:' + e.code });
        }
        const attack=session.sim.attackingControls(),actions:Record<string,ActionType>=attack?{p:'pass',l:'loft',s:'shoot'}:{t:'tackle',s:'switch',d:'slide'};
        const action = actions[e.key.toLowerCase()];
        if (action && !e.repeat) {
            e.preventDefault();
            session.dispatch({ type: action });
        }
    }, options);
    document.addEventListener('keyup', e => {
        const direction = keys[e.key.toLowerCase()];
        if (direction)
            session.dispatch({ type: 'hold', key: direction, value: false, source: 'keyboard:' + e.code });
    }, options);
    const pointers = new Set<number>(),sticks=new Map<number,{pad:HTMLElement;directions:Direction[]}>();
    const steer=(e:PointerEvent)=>{
        const stick=sticks.get(e.pointerId);if(!stick)return;
        const r=stick.pad.getBoundingClientRect(),next=padDirections((e.clientX-r.x-r.width/2)/(r.width/2),(e.clientY-r.y-r.height/2)/(r.height/2),stick.directions),source='pointer:'+e.pointerId;
        for(const direction of stick.directions)if(!next.includes(direction))session.dispatch({type:'hold',key:direction,value:false,source});
        for(const direction of next)if(!stick.directions.includes(direction))session.dispatch({type:'hold',key:direction,value:true,source});
        stick.directions=next;
    };
    container.addEventListener('pointerdown', e => {
        const pad=(e.target as HTMLElement).closest<HTMLElement>('[data-stick]');
        if(pad){
            if(pad.getAttribute('aria-disabled')==='true')return;
            e.preventDefault();pad.setPointerCapture(e.pointerId);sticks.set(e.pointerId,{pad,directions:[]});steer(e);return;
        }
        const target = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-hold],button[data-action]');
        if (!target || target.disabled)
            return;
        e.preventDefault();
        target.setPointerCapture(e.pointerId);
        pointers.add(e.pointerId);
        target.dataset.pressed = 'true';
        const direction = target.dataset.hold as Direction | undefined, action = target.dataset.action as ActionType | undefined;
        if (direction)
            session.dispatch({ type: 'hold', key: direction, value: true, source: 'pointer:' + e.pointerId });
        else if (action)
            session.dispatch({ type: action });
    }, options);
    container.addEventListener('pointermove',e=>{if(sticks.has(e.pointerId)){e.preventDefault();steer(e);}},options);
    const release = (e: PointerEvent) => {
        const stick=sticks.get(e.pointerId);
        if(stick){for(const key of stick.directions)session.dispatch({type:'hold',key,value:false,source:'pointer:'+e.pointerId});sticks.delete(e.pointerId);return;}
        const target = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-hold],button[data-action]');
        if (!target)
            return;
        delete target.dataset.pressed;
        pointers.delete(e.pointerId);
        const direction = target.dataset.hold as Direction | undefined;
        if (direction)
            session.dispatch({ type: 'hold', key: direction, value: false, source: 'pointer:' + e.pointerId });
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
        container.addEventListener(name, release as EventListener, options);
    const background = () => {
        session.setBackground(true);
        for (const el of container.querySelectorAll<HTMLElement>('[data-pressed]'))
            delete el.dataset.pressed;
        pointers.clear();
        sticks.clear();
    };
    window.addEventListener('blur', background, options);
    window.addEventListener('focus', () => { if (!document.hidden) session.setBackground(false); }, options);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden)
            background();
        else session.setBackground(false);
    }, options);
    if (document.hidden) background();
    return () => {
        controller.abort();
        pointers.clear();
        sticks.clear();
        for (const el of container.querySelectorAll<HTMLElement>('[data-pressed]'))
            delete el.dataset.pressed;
        session.sim.clear();
    };
}
