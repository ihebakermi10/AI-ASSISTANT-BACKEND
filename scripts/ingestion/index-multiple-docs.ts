import 'dotenv/config';
import { createEmbedding } from '../../src/infra/openai.client.js';
import { upsertToPinecone } from '../../src/infra/pinecone.client.js';
import { logger } from '../../src/infra/logger.js';

const sampleDocuments = [
  {
    title: 'Product Warranty Information',
    content: `
WARRANTY COVERAGE

1. Standard Warranty
All products come with a 1-year limited warranty covering manufacturing defects.
The warranty begins from the date of purchase and covers parts and labor.

2. What's Covered
- Manufacturing defects in materials or workmanship
- Hardware failures under normal use conditions
- Software issues with pre-installed programs

3. What's Not Covered
- Accidental damage or misuse
- Normal wear and tear
- Cosmetic damage that doesn't affect functionality
- Unauthorized repairs or modifications
- Damage from natural disasters

4. Warranty Claims
To file a warranty claim:
1. Contact our support team with proof of purchase
2. Describe the issue in detail
3. Follow troubleshooting steps if provided
4. Ship the product to our repair center if needed

5. Extended Warranty
Extended warranty plans are available for purchase:
- 2-year extended warranty: Additional 1 year coverage
- 3-year extended warranty: Additional 2 years coverage
Must be purchased within 30 days of original purchase.

CONTACT FOR WARRANTY SERVICE
Email: warranty@example.com
Phone: 1-800-WARRANTY (1-800-927-7268)
`,
  },
  {
    title: 'Shipping and Delivery Policy',
    content: `
SHIPPING OPTIONS

1. Standard Shipping
- Delivery time: 5-7 business days
- Cost: Free on orders over $50, otherwise $5.99
- Tracking available

2. Express Shipping
- Delivery time: 2-3 business days
- Cost: $14.99
- Priority tracking and handling

3. Overnight Shipping
- Delivery time: Next business day
- Cost: $24.99
- Available for orders placed before 2 PM EST

INTERNATIONAL SHIPPING

We ship to over 100 countries worldwide.
Delivery times vary by destination: 7-21 business days.
International shipping costs calculated at checkout.
Customers are responsible for customs duties and taxes.

DELIVERY INFORMATION

1. Tracking Your Order
You'll receive a tracking number via email once your order ships.
Track your package on our website or the carrier's website.

2. Delivery Issues
If you experience any delivery issues:
- Package not received within expected timeframe
- Package delivered to wrong address
- Package damaged during shipping
Contact our support team within 48 hours.

3. Signature Required
High-value orders may require signature upon delivery.
If you're not available, the carrier will leave a notice.

PO BOX AND APO/FPO ADDRESSES

We ship to PO Boxes via USPS only.
APO/FPO addresses supported with 10-15 business day delivery.
`,
  },
  {
    title: 'Customer Account Management',
    content: `
CREATING AN ACCOUNT

1. Registration
Visit our website and click "Sign Up"
Provide email address and create a password
Verify your email address
Complete your profile with shipping information

Benefits of having an account:
- Faster checkout process
- Order history tracking
- Saved payment methods
- Wishlist management
- Exclusive member discounts

ACCOUNT SECURITY

1. Password Requirements
- Minimum 8 characters
- Mix of uppercase and lowercase letters
- At least one number and special character

2. Two-Factor Authentication
We recommend enabling 2FA for added security
Options: SMS code or authenticator app

3. Password Reset
Click "Forgot Password" on the login page
Enter your email address
Follow the link sent to your email
Create a new password

MANAGING YOUR INFORMATION

1. Update Personal Information
Log in to your account
Go to "Account Settings"
Update name, email, or phone number
Save changes

2. Saved Addresses
Add multiple shipping addresses
Set a default shipping address
Edit or delete addresses anytime

3. Payment Methods
Securely save credit/debit cards
Update or remove payment methods
All payment data is encrypted

ACCOUNT DELETION

To delete your account:
1. Contact our support team
2. Verify your identity
3. Request account deletion
Note: This action is permanent and cannot be undone.
Your order history will be archived but no longer accessible.
`,
  },
  {
    title: 'Product Support and Troubleshooting',
    content: `
COMMON ISSUES AND SOLUTIONS

1. Device Won't Turn On
- Check power cable connections
- Try a different power outlet
- Press and hold power button for 10 seconds
- Check for blown fuses in power adapter
If issue persists, contact support for hardware diagnosis.

2. Software Installation Problems
- Ensure system meets minimum requirements
- Disable antivirus temporarily during installation
- Run installer as administrator
- Clear temporary files and restart computer

3. Connection Issues
For Wi-Fi connectivity problems:
- Restart your router and device
- Check Wi-Fi password is correct
- Move closer to router
- Update network drivers
- Reset network settings

CUSTOMER SUPPORT CHANNELS

1. Live Chat
Available Monday-Friday, 9 AM - 6 PM EST
Average response time: 2-3 minutes
Best for quick questions and troubleshooting

2. Email Support
support@example.com
Response within 24 hours
Include order number and detailed description

3. Phone Support
1-800-123-4567
Monday-Friday: 9 AM - 6 PM EST
Saturday: 10 AM - 4 PM EST
Closed Sundays and holidays

4. Self-Service Resources
- Knowledge base with 500+ articles
- Video tutorials
- Community forums
- Downloadable user manuals

RETURNS AND EXCHANGES

If troubleshooting doesn't resolve your issue:
1. Contact support within warranty period
2. Obtain RMA (Return Merchandise Authorization) number
3. Pack item securely with all accessories
4. Ship to our returns center
5. Receive replacement or repair within 7-10 business days
`,
  },
];

function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const sentences = text.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += sentence + '. ';
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + '. ';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function indexMultipleDocuments(): Promise<void> {
  try {
    logger.info(
      { documentCount: sampleDocuments.length },
      'Starting multiple document indexing...'
    );

    for (const document of sampleDocuments) {
      logger.info({ title: document.title }, 'Processing document');

      const chunks = chunkText(document.content);
      logger.info({ chunkCount: chunks.length }, 'Document split into chunks');

      const vectors: Array<{
        id: string;
        values: number[];
        metadata: Record<string, any>;
      }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        logger.info({ index: i + 1, total: chunks.length }, 'Processing chunk');

        const embedding = await createEmbedding(chunk);

        vectors.push({
          id: `${document.title.toLowerCase().replace(/\s+/g, '-')}-chunk-${i}`,
          values: embedding,
          metadata: {
            text: chunk,
            source: document.title,
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await upsertToPinecone(vectors);

      logger.info(
        {
          documentTitle: document.title,
          vectorCount: vectors.length,
        },
        'Document indexed successfully'
      );

      console.log('\n---\n');
    }

    logger.info('All documents indexed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to index documents');
    process.exit(1);
  }
}

void indexMultipleDocuments();
