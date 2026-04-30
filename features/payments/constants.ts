type PaymentTestScenario =
  | "paid"
  | "paid:failed"
  | "cancelled"
  | `error:${"insufficient_balance" | "network_error" | "pre_checkout_rejected" | "pre_checkout_timeout" | "unknown"}`;

export type DiamondProduct = {
  id: string;
  name: string;
  description: string;
  diamonds: number;
  price: string;
  amount: string;
  token: string;
  network: string;
  recipientAddress: string;
  iconUrl: string;
  test?: PaymentTestScenario;
};

const ICON_URL = "https://avatars.githubusercontent.com/u/40111175?s=40&v=4";

const SOLANA_RECIPIENT = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS!;
const ALIEN_RECIPIENT = process.env.NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS!;

export const DIAMOND_PRODUCTS: DiamondProduct[] = [
  {
    id: "usdc-diamonds-10",
    name: "Small Pouch",
    description: "A handful of sparkling diamonds to get you started.",
    diamonds: 10,
    price: "0.01 USDC",
    amount: "10000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "usdc-diamonds-50",
    name: "Medium Bag",
    description: "A generous bag of brilliant-cut diamonds.",
    diamonds: 50,
    price: "0.04 USDC",
    amount: "40000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "usdc-diamonds-150",
    name: "Large Chest",
    description: "A treasure chest overflowing with premium diamonds.",
    diamonds: 150,
    price: "0.10 USDC",
    amount: "100000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "usdc-diamonds-500",
    name: "Royal Vault",
    description: "A king's ransom in flawless diamonds. Best value!",
    diamonds: 500,
    price: "0.30 USDC",
    amount: "300000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "alien-diamonds-10",
    name: "Small Pouch",
    description: "A handful of sparkling diamonds to get you started.",
    diamonds: 10,
    price: "0.01 ALIEN",
    amount: "10000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "alien-diamonds-50",
    name: "Medium Bag",
    description: "A generous bag of brilliant-cut diamonds.",
    diamonds: 50,
    price: "0.04 ALIEN",
    amount: "40000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "alien-diamonds-150",
    name: "Large Chest",
    description: "A treasure chest overflowing with premium diamonds.",
    diamonds: 150,
    price: "0.10 ALIEN",
    amount: "100000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
  {
    id: "alien-diamonds-500",
    name: "Royal Vault",
    description: "A king's ransom in flawless diamonds. Best value!",
    diamonds: 500,
    price: "0.30 ALIEN",
    amount: "300000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
  },
];

export const TEST_DIAMOND_PRODUCTS: DiamondProduct[] = [
  {
    id: "test-usdc-diamonds-10",
    name: "Small Pouch (USDC)",
    description: "Test purchase — no real tokens transferred.",
    diamonds: 10,
    price: "0.01 USDC",
    amount: "10000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
    test: "paid",
  },
  {
    id: "test-alien-diamonds-10",
    name: "Small Pouch (ALIEN)",
    description: "Test purchase — ALIEN token, no real transfer.",
    diamonds: 10,
    price: "0.01 ALIEN",
    amount: "10000000",
    token: "ALIEN",
    network: "alien",
    recipientAddress: ALIEN_RECIPIENT,
    iconUrl: ICON_URL,
    test: "paid",
  },
  {
    id: "test-diamonds-cancelled",
    name: "Cancelled Test",
    description: "Test purchase — simulates user cancellation.",
    diamonds: 10,
    price: "0.01 USDC",
    amount: "10000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
    test: "cancelled",
  },
  {
    id: "test-diamonds-failed",
    name: "Failed Test",
    description: "Test purchase — simulates webhook failure after pay.",
    diamonds: 10,
    price: "0.01 USDC",
    amount: "10000",
    token: "USDC",
    network: "solana",
    recipientAddress: SOLANA_RECIPIENT,
    iconUrl: ICON_URL,
    test: "paid:failed",
  },
];
