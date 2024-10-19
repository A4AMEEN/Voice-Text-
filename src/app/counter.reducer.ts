import { createReducer,on } from "@ngrx/store";
import { StoreModule } from "@ngrx/store";
import { increment,decrement,reset } from "./counter.actions";

export const inititalState = 0;
export const coutnerReducer = createReducer(
    inititalState,
    on(increment,(state)=> state + 1),
    on(decrement,(state)=> state - 1),
    on(reset,(state)=> 0)
)