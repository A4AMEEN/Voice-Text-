import { animate, style, transition, trigger, state } from '@angular/animations';
import { Component, OnInit, NgZone, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../envs/env';
import { timer } from 'rxjs';
import { retryWhen, delayWhen, tap, take } from 'rxjs/operators';

interface ChatMessage {
  text: string;
  isUser: boolean;
}

@Component({
  selector: 'app-voice-to-text',
  template: `
    <div class="chat-container">
      <div class="sidebar">
        <div class="logo">
          <svg viewBox="0 0 24 24" width="32" height="32">
            <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
          </svg>
          <span>VoiceGPT</span>
        </div>
        <button class="new-chat" (click)="startNewChat()" [@buttonPulse]="'in'">+ New chat</button>
        <div class="chat-history">
          <div *ngFor="let chat of chatHistory; let i = index" 
               class="chat-history-item" 
               (click)="loadChat(i)"
               [@listAnimation]>
            Chat {{i + 1}}
          </div>
        </div>
      </div>
      <div class="main-content">
        <div class="chat-messages" #chatContainer>
          <div *ngFor="let message of currentChat; let i = index" 
               [ngClass]="{'user-message': message.isUser, 'bot-message': !message.isUser}" 
               [@messageAnimation]="message.isUser ? 'userMessage' : 'botMessage'">
            <div class="message-icon">
              <svg *ngIf="message.isUser" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
              </svg>
              <svg *ngIf="!message.isUser" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z" />
              </svg>
            </div>
            <div class="message-content">
              <p>{{ message.text }}</p>
            </div>
          </div>
        </div>
        <div class="input-area">
          <textarea 
            [(ngModel)]="currentMessage" 
            placeholder="Type a message or start speaking..."
            (keyup.enter)="sendMessage()"
            (ngModelChange)="onInputChange()"
            [@textareaAnimation]="isTyping ? 'typing' : 'idle'"
          ></textarea>
          <button class="send-button" 
                  (click)="sendMessage()" 
                  [@buttonAnimation]="currentMessage.length > 0 ? 'active' : 'inactive'">
            Send
          </button>
          <button class="voice-button" 
                  (click)="toggleListening()" 
                  [@buttonAnimation]="isListening ? 'active' : 'inactive'">
            {{ isListening ? 'Stop' : 'Start' }} Voice
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .sidebar {
      width: 260px;
      background-color: #202123;
      color: white;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }

    .new-chat {
      background-color: #343541;
      color: white;
      border: 1px solid #565869;
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.3s, transform 0.3s;
      margin-bottom: 20px;
    }

    .new-chat:hover {
      background-color: #40414f;
      transform: scale(1.05);
    }

    .chat-history {
      overflow-y: auto;
    }

    .chat-history-item {
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.3s, transform 0.3s;
      border-radius: 5px;
    }

    .chat-history-item:hover {
      background-color: #2a2b32;
      transform: translateX(5px);
    }

    .main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      background-color: #343541;
    }

    .chat-messages {
      flex-grow: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .user-message, .bot-message {
      margin-bottom: 20px;
      display: flex;
      align-items: flex-start;
    }

    .user-message {
      flex-direction: row-reverse;
    }

    .message-icon {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: #444654;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 10px;
    }

    .user-message .message-icon {
      background-color: #19c37d;
    }

    .message-content {
      background-color: #444654;
      padding: 10px 15px;
      border-radius: 15px;
      max-width: 70%;
    }

    .user-message .message-content {
      background-color: #19c37d;
    }

    .message-content p {
      margin: 0;
      color: white;
    }

    .input-area {
      background-color: #40414f;
      padding: 20px;
      display: flex;
      align-items: center;
      position: relative;
    }

    textarea {
      flex-grow: 1;
      background-color: #40414f;
      border: 1px solid #565869;
      color: white;
      padding: 10px;
      border-radius: 5px;
      resize: none;
      height: 40px;
      transition: box-shadow 0.3s;
    }

    .send-button, .voice-button {
      background-color: #19c37d;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      margin-left: 10px;
      cursor: pointer;
      transition: background-color 0.3s, transform 0.3s;
    }

    .send-button:hover, .voice-button:hover {
      background-color: #15a367;
      transform: scale(1.05);
    }
  `],
  animations: [
    trigger('messageAnimation', [
      transition('void => userMessage', [
        style({ opacity: 0, transform: 'translateX(50px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition('void => botMessage', [
        style({ opacity: 0, transform: 'translateX(-50px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('textareaAnimation', [
      state('idle', style({
        boxShadow: 'none'
      })),
      state('typing', style({
        boxShadow: '0 0 0 2px #19c37d'
      })),
      transition('idle <=> typing', animate('200ms ease-in-out'))
    ]),
    trigger('buttonAnimation', [
      state('inactive', style({
        transform: 'scale(1)'
      })),
      state('active', style({
        transform: 'scale(1.05)'
      })),
      transition('inactive <=> active', animate('100ms ease-in-out'))
    ]),
    trigger('buttonPulse', [
      state('in', style({transform: 'scale(1)'})),
      transition('void => *', [
        style({transform: 'scale(0)'}),
        animate('300ms ease-out', style({transform: 'scale(1.1)'})),
        animate('100ms', style({transform: 'scale(1)'}))
      ])
    ]),
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ])
  ]
})
export class VoiceToTextComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer: ElementRef;

  currentMessage: string = '';
  isListening: boolean = false;
  recognition: any;
  chatHistory: ChatMessage[][] = [[]];
  currentChatIndex: number = 0;
  isLoading: boolean = false;
  isTyping: boolean = false;
  private retryDelay = 1000;
  private lastProcessedIndex: number = -1;

  constructor(private ngZone: NgZone, private http: HttpClient) {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        this.ngZone.run(() => {
          this.currentMessage = finalTranscript + interimTranscript;
          this.isTyping = this.currentMessage.length > 0;
          if (finalTranscript && event.resultIndex > this.lastProcessedIndex) {
            this.lastProcessedIndex = event.resultIndex;
            this.processVoiceInput(finalTranscript.trim());
          }
        });
      };
    } else {
      console.error('Speech recognition not supported');
    }
  }

  ngOnInit(): void {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening(): void {
    this.recognition.start();
    this.isListening = true;
    this.lastProcessedIndex = -1;
  }

  stopListening(): void {
    this.recognition.stop();
    this.isListening = false;
  }

  processVoiceInput(input: string): void {
    if (input.toLowerCase() === 'clear') {
      this.startNewChat();
    } else if (input.toLowerCase() === 'mute') {
      this.stopListening();
    } else {
      this.sendMessage(input);
    }
  }

  onInputChange(): void {
    this.isTyping = this.currentMessage.length > 0;
  }

  sendMessage(message?: string): void {
    const textToSend = message || this.currentMessage.trim();
    if (textToSend) {
      this.chatHistory[this.currentChatIndex].push({ text: textToSend, isUser: true });
      this.getResponse(textToSend);
      this.currentMessage = '';
      this.isTyping = false;
    }
  }

  getResponse(question: string): void {
    this.isLoading = true;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.huggingfaceApiKey}`,
      'Content-Type': 'application/json'
    });
  
    const body = {
      inputs: question,
      parameters: {
        max_length: 150,
        temperature: 0.7,
        top_k: 50,
        top_p: 0.95
      }
    };
  
    this.http.post('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', body, { headers: headers })
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            delayWhen(() => timer(this.retryDelay)),
            tap(() => {
              console.log(`Retrying after ${this.retryDelay}ms`);
              this.retryDelay *= 2; // Double the delay for next retry
            }),
            take(3) // Limit to 3 retry attempts
          )
        )
      )
      .subscribe(
        (response: any) => {
          const aiResponse = response[0]?.generated_text || "I'm sorry, I couldn't generate a response. Please try again.";
          this.addMessageWithAnimation({ text: aiResponse, isUser: false });
          this.speakResponse(aiResponse);
          this.isLoading = false;
          this.retryDelay = 1000; // Reset retry delay on successful request
        },
        (error) => {
          console.error('Error fetching AI response:', error);
          this.addMessageWithAnimation({ 
            text: "I'm sorry, there was an error processing your request. Please try again later.", 
            isUser: false 
          });
          this.isLoading = false;
          this.retryDelay = 1000; // Reset retry delay on error
        }
      );
  }
  
  speakResponse(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        // Add animation or visual cue that speech is happening
        // For example, you could add a class to the last bot message
        const lastBotMessage = document.querySelector('.bot-message:last-child');
        if (lastBotMessage) {
          lastBotMessage.classList.add('speaking');
        }
      };
      utterance.onend = () => {
        // Remove the animation or visual cue
        const lastBotMessage = document.querySelector('.bot-message:last-child');
        if (lastBotMessage) {
          lastBotMessage.classList.remove('speaking');
        }
      };
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Text-to-speech not supported');
    }
  }
  
  startNewChat(): void {
    this.chatHistory.push([]);
    this.currentChatIndex = this.chatHistory.length - 1;
    this.currentMessage = '';
    // Add animation for new chat creation
    this.animateNewChat();
  }
  
  loadChat(index: number): void {
    this.currentChatIndex = index;
    // Add animation for chat loading
    this.animateChatLoad();
  }
  
  get currentChat(): ChatMessage[] {
    return this.chatHistory[this.currentChatIndex];
  }
  
  // New helper methods for animations
  
  addMessageWithAnimation(message: ChatMessage): void {
    this.chatHistory[this.currentChatIndex].push(message);
    // Trigger the message animation in the view
    setTimeout(() => {
      const lastMessage = document.querySelector('.chat-messages > div:last-child');
      if (lastMessage) {
        lastMessage.classList.add('animate-in');
      }
    }, 0);
  }
  
  animateNewChat(): void {
    // Add animation for new chat creation
    const newChatButton = document.querySelector('.new-chat');
    if (newChatButton) {
      newChatButton.classList.add('pulse');
      setTimeout(() => {
        newChatButton.classList.remove('pulse');
      }, 300);
    }
  }
  
  animateChatLoad(): void {
    // Add animation for chat loading
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.classList.add('fade-in');
      setTimeout(() => {
        chatMessages.classList.remove('fade-in');
      }, 300);
    }
  }
}