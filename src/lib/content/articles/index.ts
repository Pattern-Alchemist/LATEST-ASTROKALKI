/**
 * Combined article index — exports all cluster articles
 * (25 original + 25 expansion) and provides helpers for looking
 * them up.
 *
 * Original 25 articles are grouped in 5 cluster files.
 * Expansion 25 articles are individual default-export files.
 */

import type { Article } from "../article-types";
import { RELATIONSHIP_PATTERNS_ARTICLES } from "./relationship-patterns";
import { SELF_SABOTAGE_ARTICLES } from "./self-sabotage";
import { IDENTITY_PURPOSE_ARTICLES } from "./identity-purpose";
import { ASTROLOGY_PSYCHOLOGY_ARTICLES } from "./astrology-psychology";
import { PSYCHOLOGICAL_OBSERVATIONS_ARTICLES } from "./psychological-observations";

// --- M8-d expansion articles (25 new, one per file, default export) ---
import whyAttractingUnavailablePartners from "./why-do-i-keep-attracting-emotionally-unavailable-partners";
import whySabotageGoodRelationships from "./why-do-i-sabotage-good-relationships";
import whatIsATraumaBond from "./what-is-a-trauma-bond-and-why-is-it-so-hard-to-leave";
import whyLoseMyselfInRelationships from "./why-do-i-lose-myself-in-relationships";
import whyChoosePartnersWhoNeedFixing from "./why-do-i-keep-choosing-partners-who-need-fixing";
import whyAfraidOfBeingAlone from "./why-am-i-afraid-of-being-alone-in-a-relationship";

import whySelfSabotageWhenGoingWell from "./why-do-i-self-sabotage-when-things-are-going-well";
import whyProcrastinateOnWhatMatters from "./why-do-i-procrastinate-on-things-that-matter-to-me";
import whySabotageMyOwnSuccess from "./why-do-i-sabotage-my-own-success";
import whyPushPeopleAwayWhenClose from "./why-do-i-push-people-away-when-they-get-close";
import whyCreateConflictWhenPeaceful from "./why-do-i-create-conflict-when-things-are-peaceful";
import whySelfSabotageMyCareer from "./why-do-i-self-sabotage-my-career";
import whySabotageHealthAndWellbeing from "./why-do-i-sabotage-my-health-and-wellbeing";

import whyFeelLostInLife from "./why-do-i-feel-lost-in-life";
import whyNotKnowWhoIAm from "./why-do-i-not-know-who-i-am";
import whyLivingSomeoneElsesLife from "./why-do-i-feel-like-im-living-someone-elses-life";
import whatIsMyPurposeNothingRight from "./what-is-my-purpose-when-nothing-feels-right";
import whyKeepChangingMyMindAboutCareer from "./why-do-i-keep-changing-my-mind-about-my-career";
import whyDisconnectedFromCulture from "./why-do-i-feel-disconnected-from-my-culture-and-roots";

import howAstrologyWorksWithPsychology from "./how-does-astrology-work-with-psychology";
import predictionVsPatternRecognition from "./what-is-the-difference-between-prediction-and-pattern-recognition";
import canAstrologyHelpWithHealing from "./can-astrology-help-with-emotional-healing";
import whatIsShadowWorkInAstrology from "./what-is-shadow-work-in-astrology";
import howRepeatingCyclesShowUp from "./how-do-repeating-cycles-show-up-in-a-birth-chart";
import isAstrologyASubstituteForTherapy from "./is-astrology-a-substitute-for-therapy";

export type { Article, ArticleFAQ, ArticleReference } from "../article-types";

export const ALL_ARTICLES: Article[] = [
  ...RELATIONSHIP_PATTERNS_ARTICLES,
  ...SELF_SABOTAGE_ARTICLES,
  ...IDENTITY_PURPOSE_ARTICLES,
  ...ASTROLOGY_PSYCHOLOGY_ARTICLES,
  ...PSYCHOLOGICAL_OBSERVATIONS_ARTICLES,
  // M8-d expansion — 25 new articles across the 4 main clusters
  whyAttractingUnavailablePartners,
  whySabotageGoodRelationships,
  whatIsATraumaBond,
  whyLoseMyselfInRelationships,
  whyChoosePartnersWhoNeedFixing,
  whyAfraidOfBeingAlone,
  whySelfSabotageWhenGoingWell,
  whyProcrastinateOnWhatMatters,
  whySabotageMyOwnSuccess,
  whyPushPeopleAwayWhenClose,
  whyCreateConflictWhenPeaceful,
  whySelfSabotageMyCareer,
  whySabotageHealthAndWellbeing,
  whyFeelLostInLife,
  whyNotKnowWhoIAm,
  whyLivingSomeoneElsesLife,
  whatIsMyPurposeNothingRight,
  whyKeepChangingMyMindAboutCareer,
  whyDisconnectedFromCulture,
  howAstrologyWorksWithPsychology,
  predictionVsPatternRecognition,
  canAstrologyHelpWithHealing,
  whatIsShadowWorkInAstrology,
  howRepeatingCyclesShowUp,
  isAstrologyASubstituteForTherapy,
];

export const ARTICLE_BY_SLUG: Record<string, Article> = Object.fromEntries(
  ALL_ARTICLES.map((a) => [a.slug, a])
);

export function getArticleBySlug(slug: string): Article | null {
  return ARTICLE_BY_SLUG[slug] ?? null;
}

export function getArticlesByCluster(clusterSlug: string): Article[] {
  return ALL_ARTICLES.filter((a) => a.cluster === clusterSlug);
}

export function getRelatedArticles(article: Article, limit = 3): Article[] {
  const related = article.relatedArticles
    .map((slug) => ARTICLE_BY_SLUG[slug])
    .filter((a): a is Article => Boolean(a));
  return related.slice(0, limit);
}

export function getAllArticleSlugs(): string[] {
  return ALL_ARTICLES.map((a) => a.slug);
}
