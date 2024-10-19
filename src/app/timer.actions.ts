import { createAction,createReducer,on } from "@ngrx/store";

export interface TimerState{
    seconds:number,
    running : boolean
}

export const Start = createAction('[Timer] Start')
export const Stop = createAction('[Timer] Stop')
export const Reset = createAction('[Timer] Reset')

const inititalState:TimerState={
    seconds:0,
    running:false
}

export const timerReducer=createReducer(
    inititalState,
    on(Start,(state)=>({...state,running:true})),
    on(Stop,(state)=>({...state,running:false})),
    on(Reset,()=>inititalState)
)