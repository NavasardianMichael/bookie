import { cache } from 'react'
import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processCategoriesListResponse, processCategoryResponse } from './processors'
import { GetCategoriesListAPI, GetCategoryAPI } from './types'

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
