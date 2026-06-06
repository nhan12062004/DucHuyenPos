import React from 'react';

export function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M170 150H228C281 150 322 190 322 240C322 292 281 332 228 332H193L124 392L157 280H100L170 150Z"
        fill="#0A1B3D"
      />
      <path
        d="M239 182H204L170 250H209L188 310L274 219H233L239 182Z"
        fill="white"
      />

      <path
        d="M260 150H338V221H381V150H442V350H381V272H339C334 300 319 326 294 350H260V150Z"
        fill="#2C6BD2"
      />
      <path
        d="M355 248C332 285 310 312 310 336C310 374 339 402 376 402C414 402 444 374 444 336C444 312 422 285 399 248C388 231 366 231 355 248Z"
        fill="white"
      />
      <path
        d="M370 308C362 321 356 332 356 344C356 362 369 376 387 381C381 376 372 365 372 347C372 335 376 323 382 311C384 307 383 301 379 299C376 298 372 301 370 308Z"
        fill="#2C6BD2"
      />
    </svg>
  );
}
