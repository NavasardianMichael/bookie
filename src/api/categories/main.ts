import { cache } from 'react'
import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import {
  processCategoriesListResponse,
  processCategoryResponse,
  processFindSimilarCategoriesResponse,
  processSearchCategoriesResponse,
} from './processors'
import { FindSimilarCategoriesAPI, GetCategoriesListAPI, GetCategoryAPI, SearchCategoriesAPI } from './types'

export const getCategoriesListAPI: GetCategoriesListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetCategoriesListAPI['response']>>(ENDPOINTS.getCategoriesList)
  const processedResponse = processCategoriesListResponse(data)
  return processedResponse
}

/** Dedupes generateMetadata + page fetches within a single request. */
const fetchCategory = cache(async (id: string) => {
  const { data } = await axiosInstance.get<APIResponse<GetCategoryAPI['response']>>(
    `${ENDPOINTS.getCategory}/${id}`
  )
  return processCategoryResponse(data)
})

export const getCategoryAPI: GetCategoryAPI['api'] = async (args) => fetchCategory(args.id)

export const searchCategoriesAPI: SearchCategoriesAPI['api'] = async ({ query, limit }) => {
  const queryString = paramsToQueryString({ q: query, limit })
  const { data } = await axiosInstance.get<APIResponse<SearchCategoriesAPI['response']>>(
    `${ENDPOINTS.searchCategories}?${queryString}`
  )
  return processSearchCategoriesResponse(data)
}

export const findSimilarCategoriesAPI: FindSimilarCategoriesAPI['api'] = async ({ name }) => {
  const queryString = paramsToQueryString({ name })
  const { data } = await axiosInstance.get<APIResponse<FindSimilarCategoriesAPI['response']>>(
    `${ENDPOINTS.findSimilarCategories}?${queryString}`
  )
  return processFindSimilarCategoriesResponse(data)
}
