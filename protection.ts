import type { Bureau } from "./types";

export const CLARITY = {
  name: "Clarity Services",
  portal: "https://consumers.clarityservices.com/securityFreeze",
  instructions: "https://www.clarityservices.com/support/security-freeze/",
  mailForm: "https://www.clarityservices.com/wp-content/uploads/2024/03/Security-Freeze-Request-2.3-5.22.pdf",
  phone: "866-390-3118",
  mailAddress: "Clarity Services, Inc.\nConsumer Support Division\nPO Box 16\nAllen, TX 75013",
};
export const FACTORTRUST = {
  name: "FactorTrust",
  portal: "https://www.factortrust.com/Consumer/CreditFreeze/Landing.aspx",
  report: "https://www.transunion.com/client-support/factortrust-consumer-inquiry",
  instructions: "https://www.factortrust.com/",
  phone: "844-773-3321",
  mailAddress: "FactorTrust, Inc.\nAttn: Consumer Inquiries\nP.O. Box 390\nWoodlyn, PA 19094",
};
export const CHEXSYSTEMS_FREEZE = {
  name: "ChexSystems",
  home: "https://www.chexsystems.com/",
  portal: "https://www.chexsystems.com/security-freeze/place-freeze",
  manage: "https://www.chexsystems.com/security-freeze/lookup-your-security-freeze",
  instructions: "https://www.chexsystems.com/security-freeze/information",
  replacementPin: "https://www.chexsystems.com/security-freeze/request-replacement-pin",
  phone: "800-887-7652",
  mailAddress: "Chex Systems, Inc.\nAttn: Security Freeze Department\nPO Box 583399\nMinneapolis, MN 55458",
};
export const BUREAU_FREEZES: { bureau: Bureau; portal: string }[] = [
  { bureau: "experian", portal: "https://www.experian.com/freeze/center.html" },
  { bureau: "equifax", portal: "https://www.equifax.com/personal/credit-report-services/credit-freeze/" },
  { bureau: "transunion", portal: "https://www.transunion.com/credit-freeze" },
  { bureau: "innovis", portal: "https://www.innovis.com/personal/securityFreeze" },
];
