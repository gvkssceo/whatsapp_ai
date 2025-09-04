# Enhanced training data expansion for WhatsApp message classification
import pandas as pd
import random
import re
from datetime import datetime, timedelta

class MessageDataGenerator:
    def __init__(self):
        # Business and urgent keywords
        self.urgent_keywords = [
            'urgent', 'asap', 'immediately', 'deadline', 'critical', 'emergency',
            'today', 'now', 'quick', 'fast', 'rush', 'priority', 'important'
        ]
        
        self.business_keywords = [
            'meeting', 'project', 'client', 'invoice', 'payment', 'contract',
            'proposal', 'deadline', 'delivery', 'budget', 'presentation',
            'conference', 'interview', 'report', 'document', 'file'
        ]
        
        self.question_starters = [
            'Can you', 'Could you', 'Would you', 'Please', 'Need to',
            'Have you', 'Did you', 'Will you', 'Are you', 'Do you'
        ]
        
        self.casual_starters = [
            'Hey', 'Hi', 'Hello', 'Good morning', 'Good evening',
            'How are you', 'What\'s up', 'Thanks', 'Thank you', 'Ok'
        ]

    def generate_p3_messages(self, count=100):
        """Generate high priority (P3) messages"""
        messages = []
        
        # Payment/invoice urgent messages
        payment_templates = [
            "URGENT: Payment of ${amount} due today for invoice #{invoice_id}",
            "Please pay the outstanding amount of ${amount} immediately",
            "Payment failed! Please retry ASAP - ${amount} pending",
            "Invoice #{invoice_id} overdue - need payment of ${amount} today",
            "Critical: Your payment of ${amount} is needed immediately"
        ]
        
        # Meeting/deadline urgent messages
        meeting_templates = [
            "URGENT: Meeting moved to {time} today - confirm attendance",
            "Deadline is {deadline} - need your input immediately",
            "Client meeting in 30 minutes - where are you?",
            "ASAP: Send the {document} before {time}",
            "Emergency meeting called for {time} - mandatory attendance"
        ]
        
        # Technical/system urgent messages
        technical_templates = [
            "CRITICAL: Server down - need immediate attention",
            "System error detected - fix required ASAP",
            "Database backup failed - urgent intervention needed",
            "Website crashed - customers complaining",
            "Security breach detected - immediate action required"
        ]
        
        # Generate messages from templates
        for template_group in [payment_templates, meeting_templates, technical_templates]:
            for _ in range(count // 6):  # Distribute evenly
                template = random.choice(template_group)
                message = self._fill_template(template)
                messages.append((message, 'P3'))
        
        return messages[:count]

    def generate_p2_messages(self, count=150):
        """Generate medium priority (P2) messages"""
        messages = []
        
        # Follow-up and reminder templates
        followup_templates = [
            "Can you please update me on the {project} status?",
            "Reminder: {document} needs to be reviewed by {deadline}",
            "Follow up on our discussion about {topic}",
            "Please confirm your availability for {event}",
            "Could you send me the {document} when you get a chance?"
        ]
        
        # Request templates
        request_templates = [
            "Please review the attached {document}",
            "Need your approval on {item}",
            "Can you help me with {task}?",
            "Could you schedule a meeting to discuss {topic}?",
            "Please provide feedback on {item}"
        ]
        
        # Information sharing templates
        info_templates = [
            "FYI: {event} has been rescheduled to {date}",
            "Update: {project} is now {status}",
            "New information about {topic} attached",
            "Meeting notes from {meeting} attached",
            "Please see the updated {document}"
        ]
        
        for template_group in [followup_templates, request_templates, info_templates]:
            for _ in range(count // 6):
                template = random.choice(template_group)
                message = self._fill_template(template)
                messages.append((message, 'P2'))
        
        return messages[:count]

    def generate_p1_messages(self, count=100):
        """Generate low priority (P1) messages"""
        messages = []
        
        # Casual conversation templates
        casual_templates = [
            "Good morning! How was your weekend?",
            "Thanks for the information",
            "Have a great day!",
            "See you later",
            "No problem, anytime",
            "Ok, sounds good",
            "Take care",
            "Talk to you soon",
            "Hope you're doing well",
            "Nice to hear from you"
        ]
        
        # Social templates
        social_templates = [
            "Did you see the news about {topic}?",
            "How was the {event} yesterday?",
            "Looking forward to {event}",
            "Hope the weather is nice there",
            "Have a wonderful {holiday}",
            "Congratulations on {achievement}",
            "Best wishes for {event}",
            "Enjoy your vacation!",
            "Welcome back!",
            "Good luck with {task}"
        ]
        
        # Simple acknowledgments
        ack_templates = [
            "Got it, thanks",
            "Ok",
            "Sure",
            "Will do",
            "Understood",
            "Received",
            "Perfect",
            "Great",
            "Awesome",
            "Cool"
        ]
        
        for template_group in [casual_templates, social_templates, ack_templates]:
            for _ in range(count // 6):
                template = random.choice(template_group)
                message = self._fill_template(template)
                messages.append((message, 'P1'))
        
        return messages[:count]

    def _fill_template(self, template):
        """Fill template with random values"""
        replacements = {
            '{amount}': f"{random.randint(100, 10000)}",
            '{invoice_id}': f"INV-{random.randint(1000, 9999)}",
            '{time}': f"{random.randint(9, 17)}:00",
            '{deadline}': f"{random.choice(['today', 'tomorrow', 'this week', 'Friday'])}",
            '{document}': random.choice(['report', 'proposal', 'contract', 'presentation', 'file']),
            '{project}': random.choice(['Alpha', 'Beta', 'Gamma', 'Delta', 'Phoenix']),
            '{topic}': random.choice(['budget', 'timeline', 'requirements', 'strategy', 'implementation']),
            '{event}': random.choice(['meeting', 'conference', 'training', 'workshop', 'presentation']),
            '{date}': f"{random.choice(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}",
            '{status}': random.choice(['completed', 'in progress', 'delayed', 'approved', 'pending']),
            '{item}': random.choice(['proposal', 'budget', 'plan', 'design', 'document']),
            '{task}': random.choice(['analysis', 'review', 'planning', 'research', 'implementation']),
            '{meeting}': random.choice(['standup', 'planning', 'review', 'strategy', 'kickoff']),
            '{holiday}': random.choice(['vacation', 'weekend', 'holiday', 'break', 'trip']),
            '{achievement}': random.choice(['promotion', 'project completion', 'award', 'recognition', 'milestone'])
        }
        
        message = template
        for placeholder, value in replacements.items():
            message = message.replace(placeholder, value)
        
        return message

    def generate_context_variations(self, base_messages, count=50):
        """Generate variations of existing messages with different contexts"""
        variations = []
        
        context_modifiers = {
            'time_pressure': ['urgent', 'ASAP', 'immediately', 'today', 'now'],
            'politeness': ['please', 'could you', 'would you mind', 'if possible'],
            'formality': ['kindly', 'I would appreciate', 'at your earliest convenience'],
            'emphasis': ['IMPORTANT:', 'NOTE:', 'FYI:', 'REMINDER:', 'UPDATE:']
        }
        
        for message, label in base_messages[:count]:
            # Add time pressure for P3
            if label == 'P3' and random.random() < 0.7:
                modifier = random.choice(context_modifiers['time_pressure'])
                varied_message = f"{modifier.upper()}: {message}"
                variations.append((varied_message, label))
            
            # Add politeness for P2
            elif label == 'P2' and random.random() < 0.5:
                modifier = random.choice(context_modifiers['politeness'])
                varied_message = f"{modifier.capitalize()} {message.lower()}"
                variations.append((varied_message, label))
            
            # Add emphasis randomly
            elif random.random() < 0.3:
                modifier = random.choice(context_modifiers['emphasis'])
                varied_message = f"{modifier} {message}"
                variations.append((varied_message, label))
        
        return variations

    def create_expanded_dataset(self, output_file='expanded_messages.csv'):
        """Create an expanded dataset with diverse message examples"""
        all_messages = []
        
        # Generate different priority messages
        print("Generating P3 (High Priority) messages...")
        p3_messages = self.generate_p3_messages(150)
        all_messages.extend(p3_messages)
        
        print("Generating P2 (Medium Priority) messages...")
        p2_messages = self.generate_p2_messages(200)
        all_messages.extend(p2_messages)
        
        print("Generating P1 (Low Priority) messages...")
        p1_messages = self.generate_p1_messages(150)
        all_messages.extend(p1_messages)
        
        # Generate variations
        print("Generating context variations...")
        variations = self.generate_context_variations(all_messages, 100)
        all_messages.extend(variations)
        
        # Shuffle the dataset
        random.shuffle(all_messages)
        
        # Create DataFrame
        df = pd.DataFrame(all_messages, columns=['text', 'label'])
        
        # Save to CSV
        df.to_csv(output_file, index=False)
        
        print(f"\nDataset created successfully!")
        print(f"Total messages: {len(df)}")
        print(f"P1 (Low): {len(df[df.label == 'P1'])}")
        print(f"P2 (Medium): {len(df[df.label == 'P2'])}")
        print(f"P3 (High): {len(df[df.label == 'P3'])}")
        print(f"Saved to: {output_file}")
        
        return df

def merge_with_existing_data(new_file='expanded_messages.csv', existing_file='../data/messages.csv', output_file='combined_messages.csv'):
    """Merge new generated data with existing labeled data"""
    try:
        # Load existing data
        existing_df = pd.read_csv(existing_file)
        print(f"Loaded existing data: {len(existing_df)} messages")
        
        # Load new data
        new_df = pd.read_csv(new_file)
        print(f"Loaded new data: {len(new_df)} messages")
        
        # Combine datasets
        combined_df = pd.concat([existing_df, new_df], ignore_index=True)
        
        # Remove duplicates based on text
        initial_count = len(combined_df)
        combined_df = combined_df.drop_duplicates(subset=['text'], keep='first')
        final_count = len(combined_df)
        
        print(f"Removed {initial_count - final_count} duplicate messages")
        
        # Save combined dataset
        combined_df.to_csv(output_file, index=False)
        
        print(f"\nCombined dataset created!")
        print(f"Total messages: {len(combined_df)}")
        print(f"P1 (Low): {len(combined_df[combined_df.label == 'P1'])}")
        print(f"P2 (Medium): {len(combined_df[combined_df.label == 'P2'])}")
        print(f"P3 (High): {len(combined_df[combined_df.label == 'P3'])}")
        print(f"Saved to: {output_file}")
        
        return combined_df
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Creating new dataset without existing data...")
        new_df = pd.read_csv(new_file)
        new_df.to_csv(output_file, index=False)
        return new_df

if __name__ == "__main__":
    # Generate expanded dataset
    generator = MessageDataGenerator()
    expanded_df = generator.create_expanded_dataset()
    
    # Merge with existing data
    combined_df = merge_with_existing_data()
    
    print("\n" + "="*50)
    print("DATA EXPANSION COMPLETE!")
    print("Next steps:")
    print("1. Review the generated data in 'combined_messages.csv'")
    print("2. Manually verify and adjust labels if needed")
    print("3. Run training/train.py with the new dataset")
    print("="*50)
