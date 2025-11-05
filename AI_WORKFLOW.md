# AI Workflow for Lottie

This document illustrates the practical workflow used with AI tools during the development of Lottie, showing real examples of the development process.

## Development Workflow

![AI Development Workflow](https://i.imgur.com/placeholder-workflow.png)

Our development process combined human creativity with AI assistance in an iterative cycle:

1. **Human Definition**: Define feature requirements and specifications
2. **AI Generation**: Generate initial code implementations
3. **Human Review**: Review, modify, and customize AI-generated code
4. **AI Refinement**: Refine and optimize based on feedback
5. **Human Integration**: Integrate the solution into the wider codebase

## Real Development Examples

### Example 1: Creating the Game Interface

#### 1. Human Definition
We needed a component to display game types for creating a new game, with intuitive selection and visual feedback.

#### 2. AI Generation
Provided the following prompt to ChatGPT:
```
Create a React component for selecting game types (Lightning Duel, Warrior Clash, Epic Tournament) with these requirements:
- Visual cards for each game type with icon, name, and description
- Selected state with visual highlighting
- Responsive design with Tailwind CSS
- Dark theme gaming aesthetic
```

#### 3. AI Output (Partial)
```jsx
<div className='grid gap-4'>
  {GAME_TYPES.map((type) => {
    const Icon = type.icon;
    const isSelected = selectedType === type.id;
    return (
      <button
        key={type.id}
        onClick={() => setSelectedType(type.id)}
        className={`flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
          isSelected
            ? 'border-blue-500 bg-blue-500/10 transform scale-105'
            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
        }`}
      >
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
          <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
        </div>
        <div className='ml-4 flex-1 text-left'>
          <h3 className='font-medium'>{type.name}</h3>
          <p className='text-sm text-gray-400'>{type.description}</p>
        </div>
      </button>
    );
  })}
</div>
```

#### 4. Human Review & Customization
We enhanced the AI solution by:
- Adding animation effects for selection
- Improving the layout for mobile devices
- Adding additional metadata display for rounds
- Ensuring accessibility with proper focus states

#### 5. Final Implementation
The resulting component became `CreateGame.tsx` with our customizations and integrations with contract functionality.

### Example 2: Smart Contract Event Handling

#### 1. Human Definition
We needed to implement event handling for game state updates from the blockchain.

#### 2. AI Generation
Prompt:
```
I need to implement Somnia SDK subscriptions to listen for game state updates from Somnia Data Streams. 
Specifically, I need to:
1. Listen for game creation events when a new game is created
2. Show a toast notification with the game ID
3. Update the UI state based on the data stream updates

How should I structure this with Somnia SDK's subscription methods?
```

#### 3. AI Output
```jsx
useEffect(() => {
  const subscription = somniaSDK.streams.subscribe(gameId, (data) => {
    const createdGameID = data.gameId;
    toast.success(`Game of ID ${createdGameID} created`, {
      duration: 3000,
    });
  });
  
  return () => subscription.unsubscribe();
}, [gameId]);
```

#### 4. Human Review & Integration
We expanded this solution to:
- Handle error cases
- Integrate with the game state context
- Add proper typing for the event data
- Add reset functionality after successful game creation

#### 5. Final Implementation
The event handling was integrated into the `CreateGame.tsx` component, providing real-time feedback to users when games are created on the blockchain.

### Example 3: Debugging Transaction Errors

#### 1. Problem Identification
Users were experiencing cryptic error messages when transactions failed.

#### 2. AI Analysis
Prompt:
```
I'm getting errors like "DataStreamError" that aren't user-friendly. I need a utility function to extract meaningful messages from Somnia SDK error objects. Here's an example error:

[Example error object]

How can I parse this to show user-friendly messages?
```

#### 3. AI Solution
```typescript
export function extractErrorMessages(error: Error | ErrorObject | string): string {
  // Convert error to string if it's an object
  const errorMessage =
    typeof error === 'string' ? error : error.message || String(error);

  // Extract the main error message if it's a ContractFunctionExecutionError
  if (errorMessage.includes('ContractFunctionExecutionError')) {
    // Check if it's a revert reason
    if (errorMessage.includes('reverted with the following reason:')) {
      const match = errorMessage.match(
        /reverted with the following reason:\s*([^\n]+)/
      );
      return match ? match[1].trim() : errorMessage;
    }
  }

  // Handle transaction rejection
  if (errorMessage.includes('User rejected the request')) {
    return 'User rejected the request.';
  }

  // Return the original message if no specific formatting is needed
  return 'unknown error';
}
```

#### 4. Human Refinement
We expanded the function to handle more error types and edge cases, resulting in the utility function in `src/utils/index.ts`.

## Lessons Learned

### Effective AI Prompting Strategies

1. **Be Specific**: Provide detailed requirements and constraints
   - Example: "Create a component that uses Tailwind CSS with a dark theme"

2. **Include Context**: Share relevant project information
   - Example: "This component will interact with Somnia Data Streams on Somnia Testnet"

3. **Iterative Refinement**: Start broad, then refine
   - Example: First generate component structure, then refine styling, then add functionality

4. **Provide Examples**: Share similar code when available
   - Example: "Here's how we styled other game components: [code]"

### Balance Between AI and Human Input

- **AI Strengths**: Boilerplate code, styling patterns, utility functions
- **Human Strengths**: Architecture decisions, UX considerations, business logic, integration

By strategically combining these strengths, we created a polished product while maintaining development efficiency. 