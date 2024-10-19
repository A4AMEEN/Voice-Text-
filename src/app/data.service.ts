import { Injectable } from "@angular/core";
import { Observable ,BehaviorSubject} from "rxjs";

@Injectable({
    providedIn:'root'
})
export class DataService{
    private dataSubject = new BehaviorSubject<any>(null);
    
    setData(data:any){
        this.dataSubject.next(data);
    }

    getData():Observable<any>{
        return this.dataSubject.asObservable()

    }
}