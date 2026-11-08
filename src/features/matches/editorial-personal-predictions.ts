import type {SportMatch} from '@/domain/matches';
import {isQuizSettleable, predictionStorageKey, type PredictionQuiz, type UserPrediction} from '../../domain/predictions/quiz';

export function selectPersonalPredictions(
  predictions: Iterable<UserPrediction>,
  matchFor: (id:string)=>SportMatch|undefined,
  quizFor: (match:SportMatch,id:string)=>PredictionQuiz|undefined,
  visible: (match:SportMatch)=>boolean = ()=>true,
) {
  const seen=new Set<string>();
  return Array.from(predictions).flatMap(prediction=>{
    const key=predictionStorageKey(prediction.matchId,prediction.quizId);
    if(seen.has(key))return [];
    seen.add(key);
    const match=matchFor(prediction.matchId);
    if(!match||!visible(match))return [];
    const quiz=quizFor(match,prediction.quizId);
    if(!quiz)return [];
    const reveal=match.status==='finished'&&prediction.status!=='settled'&&quiz.questions.length>0&&isQuizSettleable(quiz);
    return [{key,match,quiz,prediction,reveal}];
  }).sort((a,b)=>Number(b.reveal)-Number(a.reveal)||
    (Date.parse(b.prediction.submittedAt)||0)-(Date.parse(a.prediction.submittedAt)||0)||a.key.localeCompare(b.key));
}

export function personalPredictionStatus(match:SportMatch,prediction?:UserPrediction):string {
  if(prediction?.status==='settled')return 'settled';
  if(match.status==='finished'&&prediction)return 'unresolved';
  if(match.status==='live')return 'live';
  return prediction?.status==='locked'?'closed':match.status;
}
