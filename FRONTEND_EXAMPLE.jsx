// Frontend Example: How to Handle Negotiation Flow as Addon to Existing Automated Flow

import React, { useState } from 'react';

// EXISTING COMPONENTS (No Changes Needed)
const ActionInterface = ({ actionData, onButtonClick, onInputSubmit }) => {
  return (
    <div className="action-interface">
      <h3>{actionData.title}</h3>
      <p>{actionData.subtitle}</p>
      
      {actionData.buttons && (
        <div className="buttons">
          {actionData.buttons.map(button => (
            <button
              key={button.id}
              className={`btn ${button.style}`}
              onClick={() => onButtonClick(button.id, button.data)}
            >
              {button.text}
            </button>
          ))}
        </div>
      )}
      
      {actionData.input_field && (
        <div className="input-field">
          <input
            type={actionData.input_field.type}
            placeholder={actionData.input_field.placeholder}
            required={actionData.input_field.required}
            min={actionData.input_field.min}
            maxLength={actionData.input_field.maxLength}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button onClick={() => onInputSubmit(inputValue)}>
            {actionData.submit_button?.text || 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
};

// NEW COMPONENT (Only Addition Needed)
const NegotiationHistory = ({ negotiationRound, maxRounds, history }) => {
  return (
    <div className="negotiation-history">
      <h4>Negotiation Round {negotiationRound}/{maxRounds}</h4>
      {history && history.length > 0 && (
        <div className="history-list">
          {history.map((entry, index) => (
            <div key={index} className="history-entry">
              <span className="action">{entry.action}</span>
              <span className="price">₹{entry.price}</span>
              <span className="timestamp">{entry.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// MAIN CONVERSATION COMPONENT (Minimal Changes)
const ConversationComponent = ({ conversation, messages, onButtonClick, onInputSubmit }) => {
  const [inputValue, setInputValue] = useState('');
  
  // EXISTING FLOW HANDLER (No Changes for Existing States)
  const renderFlowState = (conversation) => {
    const { flow_state, awaiting_role, negotiation_round, max_negotiation_rounds, negotiation_history } = conversation;
    
    switch (flow_state) {
      // EXISTING STATES - NO CHANGES NEEDED
      case 'influencer_responding':
        return renderConnectionResponse(conversation);
      case 'brand_owner_details':
        return renderProjectDetailsInput(conversation);
      case 'influencer_reviewing':
        return renderProjectReview(conversation);
      case 'brand_owner_pricing':
        return renderPriceInput(conversation);
      case 'influencer_price_response':
        return renderPriceResponse(conversation);
      case 'brand_owner_negotiation':        // EXISTING - no changes needed
        return renderNegotiationResponse(conversation);
      case 'influencer_final_response':
        return renderFinalResponse(conversation);
      case 'payment_pending':
        return renderPaymentInterface(conversation);
      
      // NEW NEGOTIATION STATES - ONLY ADDITIONS NEEDED
      case 'influencer_price_input':         // NEW - counter offer input
        return renderCounterOfferInput(conversation);
      case 'brand_owner_price_response':     // NEW - counter offer response
        return renderCounterOfferResponse(conversation);
      
      default:
        return <div>Unknown flow state: {flow_state}</div>;
    }
  };
  
  // EXISTING RENDERERS (No Changes Needed)
  const renderConnectionResponse = (conversation) => (
    <ActionInterface
      actionData={{
        title: "Connection Request",
        subtitle: "Influencer has sent a connection request",
        buttons: [
          { id: 'accept_connection', text: 'Accept', style: 'success' },
          { id: 'reject_connection', text: 'Reject', style: 'danger' }
        ]
      }}
      onButtonClick={onButtonClick}
    />
  );
  
  const renderProjectDetailsInput = (conversation) => (
    <ActionInterface
      actionData={{
        title: "Project Details",
        subtitle: "Enter project details and requirements",
        input_field: {
          type: 'textarea',
          placeholder: 'Enter project details...',
          required: true,
          maxLength: 1000
        },
        submit_button: { text: 'Send Details' }
      }}
      onButtonClick={onButtonClick}
      onInputSubmit={onInputSubmit}
    />
  );
  
  const renderPriceResponse = (conversation) => (
    <ActionInterface
      actionData={{
        title: "Price Offer Response",
        subtitle: "How would you like to respond to this price offer?",
        buttons: [
          { id: 'accept_price', text: 'Accept Price', style: 'success' },
          { id: 'reject_price', text: 'Reject Price', style: 'danger' },
          { id: 'negotiate_price', text: 'Negotiate', style: 'secondary' }
        ]
      }}
      onButtonClick={onButtonClick}
    />
  );
  
  const renderNegotiationResponse = (conversation) => (
    <ActionInterface
      actionData={{
        title: "Negotiation Response",
        subtitle: "Choose how you'd like to respond to the negotiation request",
        buttons: [
          { id: 'agree_negotiation', text: 'Agree to Negotiate', style: 'success' },
          { id: 'reject_negotiation', text: 'Reject Negotiation', style: 'danger' }
        ]
      }}
      onButtonClick={onButtonClick}
    />
  );
  
  // NEW RENDERERS (Only Additions Needed)
  const renderCounterOfferInput = (conversation) => (
    <div>
      <NegotiationHistory
        negotiationRound={conversation.negotiation_round}
        maxRounds={conversation.max_negotiation_rounds}
        history={conversation.negotiation_history}
      />
      <ActionInterface
        actionData={{
          title: "Set Your Counter Offer",
          subtitle: `What's your counter offer for this project? (Round ${conversation.negotiation_round}/${conversation.max_negotiation_rounds})`,
          input_field: {
            type: 'number',
            placeholder: 'Enter your counter offer amount',
            required: true,
            min: 1
          },
          submit_button: { text: 'Send Counter Offer' }
        }}
        onButtonClick={onButtonClick}
        onInputSubmit={onInputSubmit}
      />
    </div>
  );
  
  const renderCounterOfferResponse = (conversation) => (
    <div>
      <NegotiationHistory
        negotiationRound={conversation.negotiation_round}
        maxRounds={conversation.max_negotiation_rounds}
        history={conversation.negotiation_history}
      />
      <ActionInterface
        actionData={{
          title: "Counter Offer Response",
          subtitle: "How would you like to respond to this counter offer?",
          buttons: [
            { id: 'accept_counter_offer', text: 'Accept Counter Offer', style: 'success' },
            { id: 'reject_counter_offer', text: 'Reject Counter Offer', style: 'danger' },
            { id: 'make_final_offer', text: 'Make Final Offer', style: 'secondary' }
          ]
        }}
        onButtonClick={onButtonClick}
      />
    </div>
  );
  
  // EXISTING BUTTON CLICK HANDLER (No Changes Needed)
  const handleButtonClick = async (buttonId, additionalData = {}) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversation.id}/button-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          button_id: buttonId,
          additional_data: additionalData
        })
      });
      
      const result = await response.json();
      if (result.success) {
        // Update conversation state (existing logic)
        updateConversationState(result.conversation);
        updateMessages(result.messages);
      }
    } catch (error) {
      console.error('Button click failed:', error);
    }
  };
  
  // EXISTING INPUT SUBMIT HANDLER (No Changes Needed)
  const handleInputSubmit = async (inputValue) => {
    try {
      console.log("🔍 [Frontend] handleInputSubmit called with:", {
        inputValue,
        flowState: conversation.flow_state,
        submitButtonId: getSubmitButtonId(conversation.flow_state)
      });
      
      const additionalData = { 
        price: (conversation.flow_state === 'influencer_price_input' || conversation.flow_state === 'brand_owner_pricing') ? inputValue : undefined,
        details: conversation.flow_state === 'brand_owner_details' ? inputValue : undefined
      };
      
      console.log("🔍 [Frontend] Additional data being sent:", additionalData);
      
      const response = await fetch(`/api/messages/conversations/${conversation.id}/button-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          button_id: getSubmitButtonId(conversation.flow_state),
          additional_data: additionalData
        })
      });
      
      const result = await response.json();
      if (result.success) {
        updateConversationState(result.conversation);
        updateMessages(result.messages);
      }
    } catch (error) {
      console.error('Input submit failed:', error);
    }
  };
  
  // Helper function to get submit button ID based on flow state
  const getSubmitButtonId = (flowState) => {
    console.log("🔍 [Frontend] getSubmitButtonId called with flowState:", flowState);
    switch (flowState) {
      case 'influencer_price_input':
        console.log("🔍 [Frontend] Returning send_counter_offer for influencer_price_input");
        return 'send_counter_offer';
      case 'brand_owner_details':
        console.log("🔍 [Frontend] Returning send_project_details for brand_owner_details");
        return 'send_project_details';
      case 'brand_owner_pricing':
        console.log("🔍 [Frontend] Returning send_price_offer for brand_owner_pricing");
        return 'send_price_offer';
      default:
        console.log("🔍 [Frontend] Returning submit for default case:", flowState);
        return 'submit';
    }
  };
  
  return (
    <div className="conversation">
      {/* Existing message rendering (no changes needed) */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            {message.action_required && message.action_data ? (
              <ActionInterface
                actionData={message.action_data}
                onButtonClick={handleButtonClick}
                onInputSubmit={handleInputSubmit}
              />
            ) : (
              <div className="message-content">{message.message}</div>
            )}
          </div>
        ))}
      </div>
      
      {/* Flow state rendering (minimal changes) */}
      <div className="flow-state">
        {renderFlowState(conversation)}
      </div>
    </div>
  );
};

export default ConversationComponent;

/*
SUMMARY OF CHANGES NEEDED:

1. ADD 2 NEW FLOW STATE HANDLERS:
   - renderCounterOfferInput() for 'influencer_price_input'
   - renderCounterOfferResponse() for 'brand_owner_price_response'

2. ADD 1 NEW COMPONENT:
   - NegotiationHistory component for showing round tracking

3. NO CHANGES NEEDED TO:
   - Existing flow state handlers
   - Button click handling
   - Input submit handling
   - Message rendering
   - API calls
   - State management

The negotiation flow integrates seamlessly with the existing automated flow system!
*/
