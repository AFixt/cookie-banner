## Modules

<dl>
<dt><a href="#module_banner">banner</a></dt>
<dd><p>Accessible Cookie Banner - Main functionality for banner and preference modal</p>
</dd>
<dt><a href="#module_consent-manager">consent-manager</a></dt>
<dd><p>Consent Manager - Handles storage, retrieval, and validation of cookie consent</p>
</dd>
<dt><a href="#module_cookie-blocker">cookie-blocker</a></dt>
<dd><p>Cookie Auto-blocking Module - Prevents tracking scripts and cookies from loading before user consent</p>
</dd>
<dt><a href="#module_cookie-banner">cookie-banner</a></dt>
<dd><p>Accessible Cookie Banner - Entry point for the library</p>
</dd>
</dl>

<a name="module_banner"></a>

## banner

Accessible Cookie Banner - Main functionality for banner and preference modal

**Version**: 1.0.0  
**Author**: Karl Groves <karlgroves@gmail.com>  
<a name="module_consent-manager"></a>

## consent-manager

Consent Manager - Handles storage, retrieval, and validation of cookie consent

**Version**: 1.0.0  
**Author**: Karl Groves <karlgroves@gmail.com>  

* [consent-manager](#module_consent-manager)
  * [~ConsentManager](#module_consent-manager..ConsentManager)
    * [new ConsentManager(options)](#new_module_consent-manager..ConsentManager_new)
    * [.getConsent()](#module_consent-manager..ConsentManager+getConsent) ⇒ <code>Object</code> \| <code>null</code>
    * [.setConsent(consent)](#module_consent-manager..ConsentManager+setConsent)
    * [.hasConsent(category)](#module_consent-manager..ConsentManager+hasConsent) ⇒ <code>boolean</code>
    * [.dispatchConsentEvent(consentData)](#module_consent-manager..ConsentManager+dispatchConsentEvent)
    * [.isConsentExpired()](#module_consent-manager..ConsentManager+isConsentExpired) ⇒ <code>boolean</code>
    * [.clearConsent()](#module_consent-manager..ConsentManager+clearConsent)

<a name="module_consent-manager..ConsentManager"></a>

### consent-manager~ConsentManager

**Kind**: inner class of [<code>consent-manager</code>](#module_consent-manager)  

* [~ConsentManager](#module_consent-manager..ConsentManager)
  * [new ConsentManager(options)](#new_module_consent-manager..ConsentManager_new)
  * [.getConsent()](#module_consent-manager..ConsentManager+getConsent) ⇒ <code>Object</code> \| <code>null</code>
  * [.setConsent(consent)](#module_consent-manager..ConsentManager+setConsent)
  * [.hasConsent(category)](#module_consent-manager..ConsentManager+hasConsent) ⇒ <code>boolean</code>
  * [.dispatchConsentEvent(consentData)](#module_consent-manager..ConsentManager+dispatchConsentEvent)
  * [.isConsentExpired()](#module_consent-manager..ConsentManager+isConsentExpired) ⇒ <code>boolean</code>
  * [.clearConsent()](#module_consent-manager..ConsentManager+clearConsent)

<a name="new_module_consent-manager..ConsentManager_new"></a>

#### new ConsentManager(options)

Create a new ConsentManager instance

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Configuration options |
| options.storageMethod | <code>string</code> | 'localStorage' or 'cookie' |
| options.expireDays | <code>number</code> | Number of days before consent expires |
| options.onConsentChange | <code>function</code> | Callback for consent changes |

<a name="module_consent-manager..ConsentManager+getConsent"></a>

#### consentManager.getConsent() ⇒ <code>Object</code> \| <code>null</code>

Get current consent settings

**Kind**: instance method of [<code>ConsentManager</code>](#module_consent-manager..ConsentManager)  
**Returns**: <code>Object</code> \| <code>null</code> - - Consent object or null if no consent is stored  
<a name="module_consent-manager..ConsentManager+setConsent"></a>

#### consentManager.setConsent(consent)

Set consent settings

**Kind**: instance method of [<code>ConsentManager</code>](#module_consent-manager..ConsentManager)  

| Param | Type | Description |
| --- | --- | --- |
| consent | <code>Object</code> | Consent object with boolean values |

<a name="module_consent-manager..ConsentManager+hasConsent"></a>

#### consentManager.hasConsent(category) ⇒ <code>boolean</code>

Check if consent is given for a specific category

**Kind**: instance method of [<code>ConsentManager</code>](#module_consent-manager..ConsentManager)  
**Returns**: <code>boolean</code> - - True if consent is given, false otherwise  

| Param | Type | Description |
| --- | --- | --- |
| category | <code>string</code> | Category to check ('functional', 'analytics', 'marketing') |

<a name="module_consent-manager..ConsentManager+dispatchConsentEvent"></a>

#### consentManager.dispatchConsentEvent(consentData)

Dispatch a custom event with consent data

**Kind**: instance method of [<code>ConsentManager</code>](#module_consent-manager..ConsentManager)  

| Param | Type | Description |
| --- | --- | --- |
| consentData | <code>Object</code> | Consent data |

<a name="module_consent-manager..ConsentManager+isConsentExpired"></a>

#### consentManager.isConsentExpired() ⇒ <code>boolean</code>

Check if the consent is expired

**Kind**: instance method of [<code>ConsentManager</code>](#module_consent-manager..ConsentManager)  
**Returns**: <code>boolean</code> - - True if consent is expired or not set  
<a name="module_consent-manager..ConsentManager+clearConsent"></a>

#### consentManager.clearConsent()

Clear stored consent

**Kind**: instance method of [<code>ConsentManager</code>](#module_consent-manager..ConsentManager)  
<a name="module_cookie-blocker"></a>

## cookie-blocker

Cookie Auto-blocking Module - Prevents tracking scripts and cookies from loading before user consent

**Version**: 1.0.0  
**Author**: Karl Groves <karlgroves@gmail.com>  
<a name="module_cookie-blocker..BlockedScript"></a>

### cookie-blocker~BlockedScript : <code>Object</code>

**Kind**: inner typedef of [<code>cookie-blocker</code>](#module_cookie-blocker)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| element | <code>HTMLScriptElement</code> | The blocked script element |
| src | <code>string</code> | The source URL of the blocked script |
| type | <code>string</code> | The type of script (e.g., 'analytics', 'marketing') |

<a name="module_cookie-banner"></a>

## cookie-banner

Accessible Cookie Banner - Entry point for the library

**Version**: 1.0.0  
**Author**: Karl Groves <karlgroves@gmail.com>  

* [cookie-banner](#module_cookie-banner)
  * [module.exports](#exp_module_cookie-banner--module.exports) : <code>Object</code> \| <code>null</code> ⏏
    * [~CookieBanner](#module_cookie-banner--module.exports..CookieBanner) : <code>object</code>
    * [~ConsentObject](#module_cookie-banner--module.exports..ConsentObject) : <code>Object</code>
    * [~CookieBannerConfig](#module_cookie-banner--module.exports..CookieBannerConfig) : <code>Object</code>

<a name="exp_module_cookie-banner--module.exports"></a>

### module.exports : <code>Object</code> \| <code>null</code> ⏏

Default export - the CookieBanner API or null in non-browser environments

**Kind**: Exported member  
<a name="module_cookie-banner--module.exports..CookieBanner"></a>

#### module.exports~CookieBanner : <code>object</code>

The main cookie banner API exposed on the global window object

**Kind**: inner namespace of [<code>module.exports</code>](#exp_module_cookie-banner--module.exports)  
<a name="module_cookie-banner--module.exports..ConsentObject"></a>

#### module.exports~ConsentObject : <code>Object</code>

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_cookie-banner--module.exports)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| functional | <code>boolean</code> | Always true, functional cookies are required |
| analytics | <code>boolean</code> | Whether analytics cookies are allowed |
| marketing | <code>boolean</code> | Whether marketing cookies are allowed |
| timestamp | <code>string</code> | ISO timestamp of when consent was given |

<a name="module_cookie-banner--module.exports..CookieBannerConfig"></a>

#### module.exports~CookieBannerConfig : <code>Object</code>

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_cookie-banner--module.exports)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [locale] | <code>string</code> | <code>&quot;&#x27;en&#x27;&quot;</code> | Language locale for the banner |
| [theme] | <code>string</code> | <code>&quot;&#x27;light&#x27;&quot;</code> | Theme for the banner ('light' or 'dark') |
| [showModal] | <code>boolean</code> | <code>true</code> | Whether to show the preferences modal |
| [onConsentChange] | <code>function</code> | | Callback function called when consent changes |
| [storageMethod] | <code>string</code> | <code>&quot;&#x27;localStorage&#x27;&quot;</code> | Storage method ('localStorage' or 'cookie') |
| [expireDays] | <code>number</code> | <code>365</code> | Number of days before consent expires |
| [categories] | <code>Object</code> | | Default consent categories |
| [categories.functional] | <code>boolean</code> | <code>true</code> | Functional cookies (always required) |
| [categories.analytics] | <code>boolean</code> | <code>false</code> | Analytics cookies default |
| [categories.marketing] | <code>boolean</code> | <code>false</code> | Marketing cookies default |
